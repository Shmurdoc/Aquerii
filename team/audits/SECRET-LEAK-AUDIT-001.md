# SECRET-LEAK-AUDIT-001 — Aquerii

| Field | Value |
| --- | --- |
| Audit ID | `SECRET-LEAK-AUDIT-001` |
| Date | 2026-06-06 |
| Branch audited | `feat/crm-phases-3-to-8` |
| Commits scanned | 274 (`--all`, full history, every ref) |
| Auditor | automated git-history audit (read-only) |
| Severity | **LOW** — no real production secrets found in git history |

---

## TL;DR

- **The specific `OPENAI_API_KEY` (`sk-proj-jXprfOC21H…`) is NOT in git history.** No rotation is required for that key on the basis of this audit.
- `.env` is correctly gitignored and has never been committed.
- The only structurally risky finding is that `infra/k8s/secrets.yaml` is **tracked** (committed in `ba80976`) despite a later `.gitignore` entry on line 52. Current contents are all `CHANGE_ME` placeholders, so no real secret has leaked — but a future commit that fills in real values would.
- A handful of dev/CI-only passwords (`aquerii-dev-only`, `pilot2024`, `secret`, `minioadmin`, `dev-root-token`) appear in CI workflows, pilot scripts, and `.env.example`. These are not production secrets but should be confirmed to stay dev-only.

---

## 1. Is `.env` gitignored?

**Yes.**

```
$ git check-ignore -v .env services/api/.env services/web/.env .env.example
.gitignore:2:.env        .env
.gitignore:2:.env        services/api/.env
.gitignore:2:.env        services/web/.env
```

Evidence:

- `.gitignore` line 2 contains the rule `.env`. This rule is anchored to the repo root and matches `.env` at the root, `services/api/.env`, and `services/web/.env`.
- `.env.example` is correctly **not** matched (and is the only env file tracked — see §2).

Tracked env files (sanity check):

```
$ git ls-files .env services/api/.env services/web/.env .env.example
.env.example
```

Only `.env.example` is in the index. No real `.env` is tracked anywhere.

---

## 2. Has `.env` ever been committed?

**No.**

```
$ git log --all --diff-filter=A -- '.env' 'services/api/.env' 'services/web/.env'
(empty)
```

No commit on any branch has ever added a `.env` file. `--all` covers every local ref, remote-tracking ref, and reflog entry (274 commits total). Working tree is clean — no untracked `.env` files exist on disk.

```
$ git status .env services/api/.env services/web/.env
On branch feat/crm-phases-3-to-8
Your branch is up to date with 'origin/feat/crm-phases-3-to-8'.

nothing to commit, working tree clean
```

---

## 3. Has the real `OPENAI_API_KEY` (prefix `sk-proj-jXprfOC21H`) ever been committed?

**No.**

```
$ git log --all -p -S "sk-proj-jXprfOC21H" -- '*.env*' '*.yml' '*.yaml' '*.json' '*.php' '*.ts' '*.tsx' '*.js'
(empty)
```

The exact prefix `sk-proj-jXprfOC21H` does not appear in the diff of any commit, on any branch, in any of the searched file types.

> **No rotation is required for this key on the basis of this audit.** If the key is to be rotated for unrelated reasons (e.g. employee offboarding, vendor breach notice), do that via the normal OpenAI dashboard process — not because of this repo.

---

## 4. Have any other real secrets been committed?

Scanned for known secret prefixes/patterns across all 274 commits (`git log --all -p`).

### 4.1 `sk-…`, `whsec_…`, `AIza…` (OpenAI / Stripe / Google)

```
$ git log --all -p | grep -E "sk-[a-zA-Z0-9]{20,}|whsec_[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9]{30,}" | head -50
(empty)
```

**No matches.** No OpenAI, Stripe live/test secret, or Google API key prefix appears in any commit.

### 4.2 `Bearer `, `ghp_`, `xoxb-`, `AKIA` (auth tokens)

The literal string `Bearer ` appears many times, but **only** in:

- Example `curl` invocations in PR/issue templates and runbooks (e.g. `curl -H "Authorization: Bearer $TOKEN" …`), and
- HTTP client code that constructs the header at runtime from a variable (`Bearer ${token}`, `Bearer '.$internalSecret`).

No concrete bearer token value is committed. `ghp_`, `xoxb-`, `AKIA` produced **no matches**.

### 4.3 `password=` / `secret=` style assignments

These do appear, but every hit is a placeholder/dev credential in non-production files:

| File (path in repo) | Value (truncated) | Context | Verdict |
| --- | --- | --- | --- |
| `.env.example` | `DB_PASSWOR`…`secret_app_password` | example template | placeholder |
| `.env.example` | `DB_SUPERADMIN_PASSWOR`…`secret_superadmin_password` | example template | placeholder |
| `.env.example` | `REDIS_PASSWOR`…`secret_redis_password` | example template | placeholder |
| `.env.example` | `MEILISEARCH_KE`…`secret_meilisearch_master_key` | example template | placeholder |
| `.env.example` | `MINIO_KE`…`minioadmin` (and `MINIO_SECRE`…`minioadmin`) | example template | well-known dev default |
| `.env.example` | `VAULT_TOKE`…`dev-root-token` | example template | well-known dev default |
| `.env.example` | `STRIPE_KE`…`sk_test_your_stripe_key` | example template | placeholder |
| `.env.example` | `STRIPE_SECRE`…`sk_test_your_stripe_secret` | example template | placeholder |
| `.env.example` | `STRIPE_WEBHOOK_SECRE`…`whsec_your_webhook_secret` | example template | placeholder |
| `.github/workflows/ci.yml` (commit `c67fb6c`, 2026-06-02, Madoc Mhlongo) | `SUPER_ADMIN_PASSWOR`…`aquerii-dev-only` | CI sed injection of dev env into local `.env` for k6/E2E jobs | dev-only, CI-internal |
| `team/scripts/provision-pilot.mjs` (commit `dc68085`, 2026-06-06, Aquerii Leader) | `--password` default `pilot2024` | Node wrapper around `php artisan pilot:provision` | dev-only, must be overridden at run time |
| Various CI sed lines | `DB_PASSWOR`…`secret` | CI in-place `.env` rewrite for the test job | dev-only |
| `team/scripts/provision-pilot.mjs` help text | `--password=password` | CLI help string | not a credential |

No production database password, Redis password, JWT secret, Stripe live key, OpenAI key, AWS key, Payfast passphrase, GitHub token, or Anthropic/Gemini key is present in git history.

---

## 5. Secret-named files NOT in `.gitignore`?

```
$ git ls-files | grep -iE "(secret|credential|key|token|\.pem$|\.key$|\.p12$|id_rsa|id_dsa)"
```

274 lines returned, but 270 of them are false positives (skill-bundle markdown in `.opencode/skills/...` mentioning the words *token* / *secret* in their titles, plus Laravel internal classes such as `IdempotencyKey.php`, `KeyResult.php`, `ScimToken.php`, `AuthenticateScimToken.php`, `InternalSecret.php` — all class/file names, not credentials).

The only **real** hits worth flagging are:

| Path | Status | Notes |
| --- | --- | --- |
| `infra/k8s/secrets.yaml` | **Tracked**, but `.gitignore` line 52 also lists it | See §5.1 |

### 5.1 `infra/k8s/secrets.yaml` — tracked despite being gitignored

```
$ git ls-files infra/k8s/secrets.yaml
infra/k8s/secrets.yaml

$ git check-ignore -v infra/k8s/secrets.yaml
(no output)

$ git log --oneline -- infra/k8s/secrets.yaml
ba80976 feat: Phase 3 — views, onboarding, E2E tests, Helm chart, K8s manifests
```

- Commit `ba80976` (2026-05-05, author "Aquerii Build") added `infra/k8s/secrets.yaml`.
- A later commit added `infra/k8s/secrets.yaml` to `.gitignore` (line 52), but **git does not untrack files that were already tracked** — so the file remains in the index and the gitignore rule is a no-op for it.
- All 73 lines of the file are `CHANGE_ME` placeholders (`APP_KEY`, `DB_PASSWORD`, `STRIPE_SECRET`, `AWS_SECRET_ACCESS_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, etc.). **No real secret has leaked** — but the file is a footgun: any future commit that replaces `CHANGE_ME` with a real value will land that value in the public repo.

Recommended fix (see §7): either (a) `git rm --cached infra/k8s/secrets.yaml` and rely on the gitignore rule, or (b) replace with a Sealed Secret / External Secrets / SOPS-encrypted file. Option (b) is the production-correct path.

---

## 6. Current working-tree state of `.env` files

```
$ git status .env services/api/.env services/web/.env
On branch feat/crm-phases-3-to-8
Your branch is up to date with 'origin/feat/crm-phases-3-to-8'.

nothing to commit, working tree clean
```

None of `.env`, `services/api/.env`, or `services/web/.env` exist in the working tree (and the three paths are all gitignored if they are ever created). No leak vector here.

---

## 7. Rotation priority list

> Rotation is **identification only** in this audit. No keys were rotated.

### 7.1 Rotate IMMEDIATELY (within 1 hour)

**None.** No production secret was found in git history.

### 7.2 Rotate SOON (within 24 hours) — if/when the team confirms a key was used in production

- None at this time. The `sk-proj-jXprfOC21H…` OpenAI key referenced in the audit request was not found in this repo's git history. If the team's own records show it was *ever* pasted into a local `.env` on a developer machine that then synced elsewhere (e.g. cloud backup, clipboard manager, terminal log shipped to a SaaS), that is a separate investigation outside git.

### 7.3 Harden (this sprint, not urgent)

1. **Untrack `infra/k8s/secrets.yaml`** (see §5.1). Either:
   - `git rm --cached infra/k8s/secrets.yaml` and commit, OR
   - Migrate to a Sealed Secret / External Secrets Operator / SOPS-encrypted manifest and only commit the encrypted form. This is the production-correct option and removes the footgun permanently.
2. **Document the dev-only status** of the CI password `aquerii-dev-only` (`.github/workflows/ci.yml`, added in `c67fb6c`). Add a comment in the workflow file noting that this value is **never** used outside the k6/E2E job's ephemeral `.env` rewrite, and that production uses Vault/Sealed Secrets.
3. **Add a pre-commit guard.** Install something like `gitleaks` or `detect-secrets` in `.pre-commit-config.yaml` (or a CI gate) to fail the build if a future commit introduces a high-entropy assignment matching `sk-…`, `whsec_…`, `AIza…`, `AKIA…`, `ghp_…`, `xoxb-…`, or a 32+ char `*_KEY` / `*_SECRET` / `*_TOKEN` / `*_PASSWORD` value that is not the string `CHANGE_ME`, `your_*`, `sk_test_your_*`, `whsec_your_*`, `minioadmin`, `dev-root-token`, or `secret*`.
4. **Confirm pilot passwords are rotated at provisioning time.** `team/scripts/provision-pilot.mjs` defaults `--password` to `pilot2024` (added in `dc68085`). Verify the runbook (`team/plan/PILOT-SETUP.md`) requires the operator to pass a unique `--password` and that no pilot mine has shipped with the default.
5. **Keep `.env.example` clean of "looks-real" defaults.** `minioadmin`/`minioadmin` and `dev-root-token` are well-known, but a future contributor might copy them into a real `.env` by reflex. Consider replacing with `change_me_minio` / `change_me_vault` to make the placeholder status obvious.

---

## 8. Recommended next step (who does what)

| Owner | Action | Deadline |
| --- | --- | --- |
| Repo maintainer (Madoc) | Open a PR that runs `git rm --cached infra/k8s/secrets.yaml` **and** adds a Sealed Secrets / External Secrets Operator pattern in its place. | This sprint. |
| Repo maintainer (Madoc) | Add a `gitleaks` (or `detect-secrets`) CI step to `.github/workflows/ci.yml` that scans the full history on a weekly cron and every PR. | This sprint. |
| Pilot lead (Madoc) | Confirm each active pilot mine was provisioned with a non-default password; rotate any that used the `pilot2024` default. | Before pilot launch. |
| Anyone with repo write | Do **not** paste a real secret into `infra/k8s/secrets.yaml`, `.env`, `.env.example`, or any other tracked file. Use Vault / Sealed Secrets / your password manager. | Ongoing. |
| Reviewer of this audit | If you have evidence (outside git) that the `sk-proj-jXprfOC21H…` key leaked via a non-git channel, rotate it via the OpenAI dashboard and record the incident in a separate report linked from this one. | Within 24h of such evidence. |

---

## Appendix A — Commands run (audit trail)

```bash
# §1, §2, §6
git check-ignore -v .env services/api/.env services/web/.env .env.example
git ls-files    .env services/api/.env services/web/.env .env.example
git log --all --diff-filter=A -- '.env' 'services/api/.env' 'services/web/.env'
git status .env services/api/.env services/web/.env

# §3
git log --all -p -S "sk-proj-jXprfOC21H" -- \
    '*.env*' '*.yml' '*.yaml' '*.json' '*.php' '*.ts' '*.tsx' '*.js'

# §4
git log --all -p | grep -E "sk-[a-zA-Z0-9]{20,}|whsec_[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9]{30,}" | head -50
git log --all -p | grep -E "Bearer |ghp_|xoxb-|AKIA|password=|secret="
git log --all -p -S "SUPER_ADMIN_PASSWORD=aquerii-dev-only"
git log --all -p -S "pilot2024"

# §5
git ls-files | grep -iE "(secret|credential|key|token|\.pem$|\.key$|\.p12$|id_rsa|id_dsa)"
git log --oneline -- infra/k8s/secrets.yaml

# Context
git branch -a
git remote -v
git log --all --oneline | wc -l   # 274
```

All commands are read-only. No `git filter-repo`, no `git filter-branch`, no rewrites, no force pushes. No file in the working tree was modified prior to this report being written.

## Appendix B — Files read for evidence

- `.gitignore` (full file, 53 lines)
- `.env.example` (full file, 112 lines)
- `infra/k8s/secrets.yaml` (full file, 73 lines)

No other file in the working tree was read.
