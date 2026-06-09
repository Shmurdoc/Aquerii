#!/usr/bin/env python3
"""
System hardening audit + endpoint verification utility.

What this script does:
1) Inventories backend routes via `php artisan route:list --json`.
2) Scans frontend/backend source for API call usage patterns.
3) Reports route usage gaps (possibly unused endpoints) and unknown calls.
4) Optionally performs live endpoint probing against a running API.
5) Optionally runs focused SCIM/field-permission contract checks.

Usage examples:
  python services/tests/python/system_hardening_audit.py --repo-root .
  python services/tests/python/system_hardening_audit.py --repo-root . --probe --base-url http://localhost:8000/api
  python services/tests/python/system_hardening_audit.py --repo-root . --probe --contracts \
      --base-url http://localhost:8000/api --workspace-id <uuid> \
      --user-token <sanctum-token> --scim-token <scim-token>
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest


ROUTE_DYNAMIC_RE = re.compile(r"\{[^}]+\}")
API_CALL_RE = re.compile(
    r"\bapi\.(get|post|put|patch|delete)\s*\(\s*([\"\'])(/api/)?([^\"\']+)\2",
    re.IGNORECASE,
)
FETCH_CALL_RE = re.compile(
    r"\bfetch\s*\(\s*([\"\'])(/api/)?([^\"\']+)\1",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class RouteDef:
    method: str
    path: str
    name: str

    @property
    def normalized(self) -> str:
        p = self.path.strip()
        if p.startswith("api/"):
            p = p[4:]
        if p.startswith("/"):
            p = p[1:]
        return p


@dataclass(frozen=True)
class ApiUse:
    method: str
    path: str
    file: str

    @property
    def normalized(self) -> str:
        p = self.path.strip()
        if p.startswith("/api/"):
            p = p[5:]
        elif p.startswith("api/"):
            p = p[4:]
        elif p.startswith("/"):
            p = p[1:]
        return p


@dataclass
class ProbeResult:
    method: str
    path: str
    status: Optional[int]
    error: Optional[str] = None


def run_cmd(cmd: List[str], cwd: Path) -> Tuple[int, str, str]:
    proc = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    return proc.returncode, proc.stdout, proc.stderr


def load_routes(api_root: Path) -> List[RouteDef]:
    rc, out, err = run_cmd(["php", "artisan", "route:list", "--json"], cwd=api_root)
    if rc != 0:
        raise RuntimeError(f"route:list failed:\n{err}\n{out}")

    raw = json.loads(out)
    routes: List[RouteDef] = []
    for row in raw:
        method = str(row.get("method", "")).upper()
        uri = str(row.get("uri", ""))
        name = str(row.get("name", ""))
        if not method or not uri:
            continue
        # Ignore debugging/sanctum-internal and web routes outside API namespace.
        if not uri.startswith("api/"):
            continue
        methods = [m.strip() for m in method.split("|") if m.strip() and m.strip() != "HEAD"]
        for m in methods:
            routes.append(RouteDef(m, uri, name))
    return routes


def iter_code_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        if any(part in {"node_modules", "vendor", ".git", "dist", "build"} for part in path.parts):
            continue
        if path.suffix.lower() in {".ts", ".tsx", ".js", ".jsx", ".py", ".php", ".md"}:
            yield path


def scan_api_usage(repo_root: Path) -> List[ApiUse]:
    uses: List[ApiUse] = []
    src_roots = [
        repo_root / "services" / "web" / "src",
        repo_root / "services" / "api" / "app",
        repo_root / "services" / "tests",
    ]

    for src in src_roots:
        if not src.exists():
            continue
        for path in iter_code_files(src):
            try:
                content = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue

            for m in API_CALL_RE.finditer(content):
                method = m.group(1).upper()
                prefix = m.group(3) or ""
                route = m.group(4)
                full = f"{prefix}{route}"
                uses.append(ApiUse(method=method, path=full, file=str(path.relative_to(repo_root))))

            for m in FETCH_CALL_RE.finditer(content):
                prefix = m.group(2) or ""
                route = m.group(3)
                full = f"{prefix}{route}"
                uses.append(ApiUse(method="GET", path=full, file=str(path.relative_to(repo_root))))

    return uses


def normalize_route_for_match(path: str) -> str:
    p = path.strip()
    if p.startswith("api/"):
        p = p[4:]
    if p.startswith("/"):
        p = p[1:]
    return p


def route_pattern_to_regex(path: str) -> re.Pattern[str]:
    p = normalize_route_for_match(path)
    escaped = re.escape(p)
    # Replace escaped placeholders like \{id\} with path segment matcher.
    escaped = ROUTE_DYNAMIC_RE.sub("[^/]+", p)
    escaped = re.escape(escaped)
    escaped = escaped.replace(re.escape("[^/]+"), "[^/]+")
    return re.compile(rf"^{escaped}$")


def match_use_to_route(api_use: ApiUse, routes: List[RouteDef]) -> bool:
    use_path = api_use.normalized
    for route in routes:
        if route.method != api_use.method:
            continue
        if route_pattern_to_regex(route.path).match(use_path):
            return True
    return False


def coverage_report(routes: List[RouteDef], uses: List[ApiUse]) -> Dict[str, object]:
    used_route_keys: Set[Tuple[str, str]] = set()
    unknown_calls: List[ApiUse] = []

    for u in uses:
        matched = False
        for r in routes:
            if r.method != u.method:
                continue
            if route_pattern_to_regex(r.path).match(u.normalized):
                used_route_keys.add((r.method, r.normalized))
                matched = True
        if not matched:
            unknown_calls.append(u)

    backend_all = {(r.method, r.normalized) for r in routes}
    unused = sorted(backend_all - used_route_keys)

    return {
        "route_count": len(routes),
        "use_count": len(uses),
        "matched_route_count": len(used_route_keys),
        "unused_route_count": len(unused),
        "unknown_call_count": len(unknown_calls),
        "unused_routes": unused,
        "unknown_calls": unknown_calls,
    }


def fill_path_template(path: str, workspace_id: str) -> str:
    p = normalize_route_for_match(path)
    replacements = {
        "workspace": workspace_id,
        "workspaceId": workspace_id,
        "board": "00000000-0000-0000-0000-000000000001",
        "item": "00000000-0000-0000-0000-000000000001",
        "userId": "00000000-0000-0000-0000-000000000001",
        "token": "00000000-0000-0000-0000-000000000001",
        "scenario": "00000000-0000-0000-0000-000000000001",
        "adjustment": "00000000-0000-0000-0000-000000000001",
        "id": "00000000-0000-0000-0000-000000000001",
    }

    def repl(match: re.Match[str]) -> str:
        key = match.group(0).strip("{}")
        return replacements.get(key, "00000000-0000-0000-0000-000000000001")

    return ROUTE_DYNAMIC_RE.sub(repl, p)


def http_request(method: str, url: str, headers: Dict[str, str], data: Optional[bytes] = None, timeout: int = 10) -> Tuple[Optional[int], Optional[str]]:
    req = urlrequest.Request(url=url, method=method, data=data, headers=headers)
    try:
        with urlrequest.urlopen(req, timeout=timeout) as resp:
            return int(resp.status), None
    except urlerror.HTTPError as e:
        return int(e.code), None
    except Exception as e:  # noqa: BLE001
        return None, str(e)


def probe_routes(
    routes: List[RouteDef],
    base_url: str,
    workspace_id: str,
    user_token: Optional[str],
    include_methods: Set[str],
) -> List[ProbeResult]:
    results: List[ProbeResult] = []
    base = base_url.rstrip("/")

    for r in routes:
        if r.method not in include_methods:
            continue

        path = fill_path_template(r.path, workspace_id)
        url = f"{base}/{path}"

        headers = {"Accept": "application/json"}
        if user_token:
            headers["Authorization"] = f"Bearer {user_token}"
        if r.method in {"POST", "PUT", "PATCH", "DELETE"}:
            headers["Idempotency-Key"] = "audit-probe-key"

        status, err = http_request(r.method, url, headers=headers)
        results.append(ProbeResult(method=r.method, path=path, status=status, error=err))

    return results


def run_contract_checks(base_url: str, workspace_id: str, user_token: str, scim_token: str) -> Dict[str, Tuple[Optional[int], Optional[str]]]:
    base = base_url.rstrip("/")
    checks: Dict[str, Tuple[Optional[int], Optional[str]]] = {}

    # Admin gate check: list field permissions should be reachable with user token.
    checks["field_permissions_list"] = http_request(
        "GET",
        f"{base}/workspaces/{workspace_id}/field-permissions",
        headers={"Accept": "application/json", "Authorization": f"Bearer {user_token}"},
    )

    # SCIM service discovery endpoint.
    checks["scim_service_provider_config"] = http_request(
        "GET",
        f"{base}/scim/v2/ServiceProviderConfig",
        headers={"Accept": "application/scim+json", "Authorization": f"Bearer {scim_token}"},
    )

    # SCIM list users endpoint.
    checks["scim_users_list"] = http_request(
        "GET",
        f"{base}/scim/v2/Users?startIndex=1&count=10",
        headers={"Accept": "application/scim+json", "Authorization": f"Bearer {scim_token}"},
    )

    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description="Aquerii endpoint audit + hardening probe")
    parser.add_argument("--repo-root", required=True, help="Repository root path")
    parser.add_argument("--probe", action="store_true", help="Probe routes against live API")
    parser.add_argument("--contracts", action="store_true", help="Run focused contract checks")
    parser.add_argument("--base-url", default="http://localhost:8000/api", help="Live API base URL")
    parser.add_argument("--workspace-id", default=os.getenv("AQ_WORKSPACE_ID", ""))
    parser.add_argument("--user-token", default=os.getenv("AQ_USER_TOKEN", ""))
    parser.add_argument("--scim-token", default=os.getenv("AQ_SCIM_TOKEN", ""))
    parser.add_argument("--methods", default="GET", help="Comma-separated HTTP methods to probe")
    parser.add_argument("--output-json", default="", help="Optional output JSON path")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    api_root = repo_root / "services" / "api"

    routes = load_routes(api_root)
    uses = scan_api_usage(repo_root)
    report = coverage_report(routes, uses)

    payload: Dict[str, object] = {
        "timestamp": int(time.time()),
        "coverage": {
            "route_count": report["route_count"],
            "use_count": report["use_count"],
            "matched_route_count": report["matched_route_count"],
            "unused_route_count": report["unused_route_count"],
            "unknown_call_count": report["unknown_call_count"],
        },
        "unused_routes": report["unused_routes"],
        "unknown_calls": [
            {"method": u.method, "path": u.path, "file": u.file}
            for u in report["unknown_calls"]
        ],
    }

    if args.probe:
        if not args.workspace_id:
            raise SystemExit("--workspace-id (or AQ_WORKSPACE_ID) is required for probing")
        include_methods = {m.strip().upper() for m in args.methods.split(",") if m.strip()}
        probes = probe_routes(
            routes=routes,
            base_url=args.base_url,
            workspace_id=args.workspace_id,
            user_token=args.user_token or None,
            include_methods=include_methods,
        )
        payload["probe"] = [
            {"method": p.method, "path": p.path, "status": p.status, "error": p.error}
            for p in probes
        ]

    if args.contracts:
        if not (args.workspace_id and args.user_token and args.scim_token):
            raise SystemExit("--contracts requires --workspace-id, --user-token, and --scim-token")
        checks = run_contract_checks(
            base_url=args.base_url,
            workspace_id=args.workspace_id,
            user_token=args.user_token,
            scim_token=args.scim_token,
        )
        payload["contracts"] = {
            name: {"status": status, "error": err}
            for name, (status, err) in checks.items()
        }

    pretty = json.dumps(payload, indent=2)
    print(pretty)

    if args.output_json:
        out = Path(args.output_json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(pretty, encoding="utf-8")

    return 0


if __name__ == "__main__":
    sys.exit(main())
