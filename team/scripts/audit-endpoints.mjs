#!/usr/bin/env node

/**
 * audit-endpoints.mjs — Cross-references all backend routes against frontend UI consumers
 *
 * Usage:
 *   node team/scripts/audit-endpoints.mjs
 *
 * Exit codes:
 *   0 — All backend routes have at least one matching frontend API call
 *   1 — One or more routes lack any frontend consumer (CI gating)
 *
 * Scans:
 *   - services/api/routes/api.php
 *   - services/api/routes/modules/*.php
 *   - services/web/src/ (all .ts and .tsx files recursively)
 *
 * Matching logic:
 *   Laravel route parameters `{param}` are matched against JavaScript template
 *   literal expressions `${...}` in frontend `api.get|post|put|patch|delete(...)` calls.
 *   HTTP method is ignored for matching — only the URL path is compared.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dirname, "../..");
const API_ROUTES_DIR = join(ROOT, "services/api/routes");
const MODULES_DIR = join(API_ROUTES_DIR, "modules");
const WEB_SRC = join(ROOT, "services/web/src");

// ─── Route Parsing ───────────────────────────────────────────────────────────

const LARAVEL_PARAM = /\{(\w+)\}/g;

/** Convert a Laravel URI pattern to a normalized wildcard string. */
function normalizeRouteUri(uri) {
  return uri.replace(LARAVEL_PARAM, "*").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

/** Singularize a word (naive — just handles basic English plurals) */
function singular(word) {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ses")) return word.slice(0, -3);
  if (word.endsWith("shes")) return word.slice(0, -3);
  if (word.endsWith("ches")) return word.slice(0, -3);
  if (word.endsWith("xes")) return word.slice(0, -3);
  if (word.endsWith("zes")) return word.slice(0, -3);
  if (word.endsWith("ves")) return word.slice(0, -3) + "f";
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Get the route parameter name from a resource name (e.g. "employee-groups" → "employee_group") */
function resourceParamName(resource) {
  const last = resource.split("/").pop();
  const sing = singular(last);
  return sing.replace(/[-.]/g, "_");
}

/**
 * Parse a PHP route file, extracting all route definitions.
 */
function parseRouteFile(filePath, initialPrefix = "") {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8");
  const routes = [];
  const rawLines = content.split("\n");

  // Join continuation lines (starting with ->) onto previous line
  // so multi-line Route::middleware(...)->prefix(...)->group(...) is seen as one line
  const joined = [];
  for (let li = 0; li < rawLines.length; li++) {
    const trimmed = rawLines[li].trim();
    if (trimmed.startsWith("->") && joined.length > 0) {
      joined[joined.length - 1] = joined[joined.length - 1].trimEnd() + " " + trimmed.trimStart();
    } else {
      joined.push(rawLines[li]);
    }
  }
  const lines = joined;

  // Stack: each entry is the current effective prefix.
  // When a `Route::prefix('X')->group(function () {` is opened, we push prefix + '/X'.
  // When a plain group (middleware, etc.) is opened, we push the current prefix again.
  // When `});` is encountered, we pop — restoring the outer prefix.
  const prefixStack = [initialPrefix.replace(/\/$/, "")];

  // Track nesting of Route::X('...', function ...) closures so their closing
  // braces don't pop the prefix stack.  A single-line closure (the function
  // and closing }) appear on the same line as Route::get) closes on the next
  // ) or }); we see.  A multi-line closure (function body on following lines)
  // requires us to skip all `}` lines until the final `});`.
  //
  // We use a simple counter: each closure route increments it, each `{` on a
  // line that isn't a group/prefix open also increments it, and each solitary
  // `}` or `};` decrements it without touching the prefix stack.  Only `});`
  // treats the counter as a barrier — when counter > 0 we decrement the
  // counter instead of popping the prefix stack.
  let closureBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    // ── Group opening with prefix ──────────────────────────────────────────
    // Pattern: Route::prefix('X')->...->group(function () {
    // We detect BOTH prefix(...) AND group on the same (logical) line.
    const prefixGroupMatch = trimmed.match(/(?:Route::|->)prefix\s*\(\s*['"]([^'"]+)['"]\s*\).*->group\s*\(\s*function\s*\(\)/);
    if (prefixGroupMatch) {
      const currentPrefix = prefixStack[prefixStack.length - 1];
      const segment = prefixGroupMatch[1];
      prefixStack.push((currentPrefix + "/" + segment).replace(/\/+/g, "/"));
      continue;
    }

    // ── Group opening WITHOUT prefix (middleware, plain group) ─────────────
    // Pattern: Route::middleware(...)->group(function () {  OR  Route::group(function () {
    // Detected by `->group(function () {` but NOT preceded by Route::prefix
    const plainGroupMatch = trimmed.match(/->group\s*\(\s*function\s*\(\)\s*\{/);
    if (plainGroupMatch && !trimmed.includes("Route::prefix")) {
      // Push the same prefix (no change) so the closing brace can pop it
      prefixStack.push(prefixStack[prefixStack.length - 1]);
      continue;
    }

    // ── Route::get / post / put / patch / delete ────────────────────────────
    const verbMatch = trimmed.match(/^Route::(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,/);
    if (verbMatch) {
      const method = verbMatch[1].toUpperCase();
      const uri = verbMatch[2];
      const prefix = prefixStack[prefixStack.length - 1];
      const fullUri = (prefix + "/" + uri).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
      const hasClosure = trimmed.includes("function") || trimmed.includes("fn ");
      if (hasClosure) {
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const uriBraces = (verbMatch[2].match(/\{/g) || []).length;
        const actualOpenBraces = openBraces - uriBraces;
        closureBraceDepth += actualOpenBraces;
      } else {
        routes.push({ method, uri: fullUri, normalized: normalizeRouteUri(fullUri), file: filePath });
      }
      continue;
    }

    // ── Route::apiResource ──────────────────────────────────────────────────
    const resMatch = trimmed.match(/^Route::apiResource\s*\(\s*['"]([^'"]+)['"]\s*,/);
    if (resMatch) {
      const resource = resMatch[1];
      const prefix = prefixStack[prefixStack.length - 1];
      const baseUri = (prefix + "/" + resource).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
      const param = resourceParamName(resource);

      const exceptMatch = trimmed.match(/->except\(\[([^\]]+)\]\)/);
      const onlyMatch = trimmed.match(/->only\(\[([^\]]+)\]\)/);
      const except = exceptMatch ? exceptMatch[1].split(",").map((s) => s.trim().replace(/['"]/g, "")) : [];
      const only = onlyMatch ? onlyMatch[1].split(",").map((s) => s.trim().replace(/['"]/g, "")) : [];

      const defs = [
        { action: "index", method: "GET", uri: baseUri },
        { action: "store", method: "POST", uri: baseUri },
        { action: "show", method: "GET", uri: `${baseUri}/{${param}}` },
        { action: "update", method: "PUT", uri: `${baseUri}/{${param}}` },
        { action: "destroy", method: "DELETE", uri: `${baseUri}/{${param}}` },
      ];

      for (const d of defs) {
        if (only.length && !only.includes(d.action)) continue;
        if (except.length && except.includes(d.action)) continue;
        routes.push({ method: d.method, uri: d.uri, normalized: normalizeRouteUri(d.uri), file: filePath });
      }
      continue;
    }

    // ── Solitary opening brace (not part of a group/prefix) — usually a
    //     closure body, if/foreach, or anonymous class inside a route handler.
    //     Match lines that are just `{` or end with `{` but aren't group/prefix openers.
    // ── Opening braces ──────────────────────────────────────────────────────
    // Count `{` on lines that are NOT group/prefix opens — these belong to
    // closure bodies, if/foreach blocks, etc. inside route handlers.
    if (!prefixGroupMatch && !plainGroupMatch && !verbMatch && trimmed.includes("{")) {
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      const net = openBraces - closeBraces;
      if (net > 0) {
        closureBraceDepth += net;
        continue;
      }
    }

    // ── Closing braces ─────────────────────────────────────────────────────
    // Pop the stack when a group closes, but only if we're not inside a route closure body.
    // Use startsWith to handle patterns like `})->middleware(...)` and `});`
    const isClose = /^\}\)?\s*(?:;|->|$)/.test(trimmed) || trimmed === "}" || trimmed === ");";
    if (isClose && prefixStack.length > 1) {
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      if (closureBraceDepth > 0 && closeBraces > 0) {
        closureBraceDepth -= closeBraces;
        if (closureBraceDepth < 0) closureBraceDepth = 0;
        continue;
      }
      prefixStack.pop();
      continue;
    }

    // ── require __DIR__.'/modules/xxx.php' ─── load module file ────────────
    const requireMatch = trimmed.match(/require\s+__DIR__\s*\.\s*['"]\/?modules\/([^'"]+)['"]/);
    if (requireMatch) {
      const moduleFile = join(MODULES_DIR, requireMatch[1]);
      const modulePrefix = prefixStack[prefixStack.length - 1];
      const moduleRoutes = parseRouteFile(moduleFile, modulePrefix);
      routes.push(...moduleRoutes);
      continue;
    }
  }

  return routes;
}

/**
 * Parse api.php + all module files, return deduplicated list of all routes.
 */
function parseAllRoutes() {
  const apiRoutes = parseRouteFile(join(API_ROUTES_DIR, "api.php"), "");

  // Also parse module files not loaded via require (standalone files)
  if (existsSync(MODULES_DIR)) {
    for (const entry of readdirSync(MODULES_DIR, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".php")) {
        const modulePath = join(MODULES_DIR, entry.name);
        // Skip files already loaded via require in api.php
        const apiContent = readFileSync(join(API_ROUTES_DIR, "api.php"), "utf-8");
        if (apiContent.includes(`modules/${entry.name}`)) continue;
        const routes = parseRouteFile(modulePath, "");
        apiRoutes.push(...routes);
      }
    }
  }

  // Deduplicate by normalized URI
  const seen = new Set();
  return apiRoutes.filter((r) => {
    const key = `${r.method}:${r.normalized}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Frontend Parsing ────────────────────────────────────────────────────────

const API_METHODS = ["get", "post", "put", "patch", "delete"];

/** Recursively collect all .ts and .tsx files from a directory. */
function collectTsFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Extract all API call paths from a frontend source file.
 * Returns array of { method, rawPath } where rawPath is the template literal string
 * with ${...} preserved.
 */
function extractApiCalls(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const calls = [];

  for (const method of API_METHODS) {
    // Match: api.get(`...`) or api.post(`...`) etc.
    const bt = "`";
    const regex = new RegExp(
      "api\\." + method + "(?:<[^>]*>)?\\s*\\(\\s*(" + bt + "(?:[^" + bt + "\\\\]|\\\\.)*" + bt + ")",
      "g"
    );
    let match;
    while ((match = regex.exec(content)) !== null) {
      const template = match[1];
      // Extract the path from the template literal
      // The template content is everything between the backticks
      const inner = template.slice(1, -1);
      calls.push({ method: method.toUpperCase(), rawPath: inner, file: filePath });
    }

    // Match: api.method('...') or api.method("...") (string literals)
    const strRegex = new RegExp(`api\\.${method}(?:<[^>]*>)?\\s*\\(\\s*['"]([^'"]+)['"]`, "g");
    let strMatch;
    while ((strMatch = strRegex.exec(content)) !== null) {
      calls.push({ method: method.toUpperCase(), rawPath: strMatch[1], file: filePath });
    }
  }

  return calls;
}

/**
 * Normalize a frontend API call path for matching.
 * Converts `${...}` → `*` and strips surrounding whitespace.
 */
function normalizeFrontendPath(rawPath) {
  // Replace template expressions with wildcard
  let normalized = rawPath.replace(/\$\{[^}]+\}/g, "*");
  // Remove leading/trailing whitespace and quotes that may be part of string concatenation
  normalized = normalized.trim();
  // Remove any leading /api prefix (frontend axios baseURL is /api)
  normalized = normalized.replace(/^\/api/, "");
  // Collapse duplicate slashes
  normalized = normalized.replace(/\/+/g, "/");
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "") || "/";
  return normalized;
}

/**
 * Check if a frontend path matches a backend route's normalized URI.
 *
 * Both have `*` as wildcards. We convert `*` to `[^/]+` regex and compare.
 */
function pathsMatch(frontendNormalized, backendNormalized) {
  // Convert wildcard-based patterns to regex
  const toRegex = (s) => {
    // Replace * with placeholder before escaping, then restore as regex group
    const withPlaceholder = s.replace(/\*/g, "___W__");
    const escaped = withPlaceholder.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const regexStr = escaped.replace(/___W__/g, "[^/]+");
    try {
      return new RegExp("^" + regexStr + "$");
    } catch {
      return /$/; // fallback — never matches
    }
  };

  const feRegex = toRegex(frontendNormalized);
  const beRegex = toRegex(backendNormalized);

  // Check both directions — frontend pattern may be more specific or more general
  return feRegex.test(backendNormalized) || beRegex.test(frontendNormalized);
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log("=== API Endpoint Audit ===\n");

// 1. Parse all backend routes
console.log("Parsing backend routes...");
const allRoutes = parseAllRoutes();
console.log(`  Found ${allRoutes.length} backend routes\n`);

// 2. Parse all frontend API calls
console.log("Scanning frontend source files...");
const tsFiles = collectTsFiles(WEB_SRC);
console.log(`  Found ${tsFiles.length} frontend source files`);

const allFrontendCalls = [];
for (const file of tsFiles) {
  const calls = extractApiCalls(file);
  allFrontendCalls.push(...calls);
}

// Also scan non-ts files for api calls with fetch() or raw axios
// (BrandingContext uses fetch('/api/branding'))
const nonTsPattern = /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/g;
for (const file of tsFiles) {
  const content = readFileSync(file, "utf-8");
  let m;
  while ((m = nonTsPattern.exec(content)) !== null) {
    let path = m[1].replace(/^\/api/, "") || "/";
    allFrontendCalls.push({ method: "GET", rawPath: path, file });
  }
}

console.log(`  Found ${allFrontendCalls.length} frontend API call references\n`);

// Normalize frontend paths
for (const call of allFrontendCalls) {
  call.normalized = normalizeFrontendPath(call.rawPath);
}

// 3. Match each backend route against frontend calls
const unusedRoutes = [];
const usedRoutes = [];

for (const route of allRoutes) {
  const match = allFrontendCalls.some((call) => pathsMatch(call.normalized, route.normalized));

  if (match) {
    usedRoutes.push(route);
  } else {
    unusedRoutes.push(route);
  }
}

// 4. Report
console.log("=== Route Usage Report ===\n");

for (const route of allRoutes) {
  const isUsed = usedRoutes.includes(route);
  const relPath = route.file ? route.file.replace(ROOT, "").replace(/\\/g, "/") : "";
  const label = isUsed ? "[USED]" : "[UNUSED — NO UI CONSUMER]";
  console.log(`  ${label} ${route.method.padEnd(6)} ${route.uri.padEnd(65)} ${relPath}`);
}

console.log(`\n  ────────────────────────────────────────────────────────────────`);
console.log(`  Total routes:     ${allRoutes.length}`);
console.log(`  Used routes:      ${usedRoutes.length}`);
console.log(`  Unused routes:    ${unusedRoutes.length}`);

// Summary by source file
const byFile = {};
for (const route of unusedRoutes) {
  const key = route.file ? route.file.replace(ROOT, "").replace(/\\/g, "/") : "unknown";
  if (!byFile[key]) byFile[key] = [];
  byFile[key].push(route);
}

console.log(`\n=== Unused Routes by Source File ===\n`);
for (const [file, routes] of Object.entries(byFile).sort(
  (a, b) => b[1].length - a[1].length
)) {
  console.log(`  ${file} (${routes.length} routes):`);
  for (const r of routes) {
    console.log(`    ${r.method.padEnd(6)} ${r.uri}`);
  }
  console.log();
}

if (unusedRoutes.length === 0) {
  console.log("✓ All routes have frontend UI consumers.");
  process.exit(0);
} else {
  console.log(`✗ ${unusedRoutes.length} route(s) have no frontend UI consumer.`);
  process.exit(1);
}
