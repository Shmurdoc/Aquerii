# TEST-RUN-007 — Post-Rebuild E2E Regression (Chromium)

| Metric | Value |
|---|---|
| **Date** | 2026-06-07 |
| **Commit** | 17bdac9 (OPcache, Sanctum, CORS, cgroup fixes) |
| **Project** | `chromium` (Playwright) |
| **Duration** | 36.2 min |
| **Total** | 49 |
| **Passed** | 18 |
| **Failed** | 31 |
| **Pass rate** | 36.7% |

---

## Passed (18)

| # | Test |
|---|---|
| 1 | `app.spec.ts:11` — Authentication › redirects unauthenticated user to login |
| 2 | `app.spec.ts:16` — Authentication › shows validation errors on empty login submit |
| 3 | `app.spec.ts:22` — Authentication › logs in with valid credentials |
| 4 | `app.spec.ts:36` — Onboarding › shows role selection for user with existing workspace |
| 5 | `app.spec.ts:57` — Boards › displays boards page |
| 6 | `app.spec.ts:61` — Boards › can create a new board |
| 7 | `app.spec.ts:66` — Boards › opens board and shows kanban view |
| 8 | `app.spec.ts:71` — Boards › can switch to table view |
| 9 | `app.spec.ts:78` — Boards › can switch to calendar view |
| 10 | `app.spec.ts:84` — Boards › navigates between pages via sidebar |
| 11 | `app.spec.ts:106` — Documents › displays documents page |
| 12 | `auth.spec.ts:6` — Auth — Registration → Onboarding → Workspace › redirects unauthenticated user to login |
| 13 | `auth.spec.ts:11` — Auth — Registration → Onboarding → Workspace › shows validation errors on empty login form |
| 14 | `auth.spec.ts:22` — Auth — Registration → Onboarding → Workspace › navigates to register page from login |
| 15 | `auth.spec.ts:28` — Auth — Registration → Onboarding → Workspace › registration form requires all fields |
| 16 | `auth.spec.ts:34` — Auth — Registration → Onboarding → Workspace › completes full registration |
| 17 | `auth.spec.ts:54` — Auth — Registration → Onboarding → Workspace › multi-factor auth input appears when required |
| 18 | `auth.spec.ts:63` — Auth — Registration → Onboarding → Workspace › shows error on invalid credentials |

## Failed (31)

| # | Test | Root Error |
|---|---|---|
| 1 | `app.spec.ts:110` — Documents › can create a new document | `TimeoutError: page.waitForURL` — redirected to `/login` instead of `/onboarding\|/boards` |
| 2 | `app.spec.ts:117` — CRM › displays pipeline view | Same — login lands on `/login` not app |
| 3 | `auth.spec.ts:17` — logs in with valid credentials | Same |
| 4 | `auth.spec.ts:47` — shows role selection onboarding | Same |
| 5 | `boards.spec.ts:11` — displays boards page with heading | Same |
| 6 | `boards.spec.ts:16` — can create a new board | Same |
| 7 | `boards.spec.ts:22` — opens board and shows kanban view | Same |
| 8 | `boards.spec.ts:28` — can create a group in a board | Same |
| 9 | `boards.spec.ts:40` — can add an item to a group | Same |
| 10 | `boards.spec.ts:53` — shows item detail modal | Same |
| 11 | `boards.spec.ts:62` — can switch between board views | Same |
| 12 | `boards.spec.ts:73` — navigates between modules via sidebar | Same |
| 13 | `boards.spec.ts:84` — board cards are displayed | Same |
| 14 | `calendar.spec.ts:3` — calendar page API query | Same |
| 15 | `crm.spec.ts:11` — displays pipeline view with stage headers | Same |
| 16 | `crm.spec.ts:18` — shows deal cards in pipeline | Same |
| 17 | `crm.spec.ts:24` — can open deal detail modal | Same |
| 18 | `crm.spec.ts:32` — add deal button is visible | Same |
| 19 | `crm.spec.ts:37` — create deal flow | Same |
| 20 | `crm.spec.ts:43` — contact CRUD — create contact | Same |
| 21 | `crm.spec.ts:61` — display CRM sidebar navigation | Same |
| 22 | `documents.spec.ts:11` — displays documents page with heading | Same |
| 23 | `documents.spec.ts:16` — shows notes and files tabs | Same |
| 24 | `documents.spec.ts:22` — can create a new document | Same |
| 25 | `documents.spec.ts:28` — document title is editable | Same |
| 26 | `documents.spec.ts:40` — document content editor is present | Same |
| 27 | `documents.spec.ts:51` — switches between notes and files tabs | Same |
| 28 | `file-upload.spec.ts:12` — avatar upload button is visible | Same |
| 29 | `file-upload.spec.ts:19` — documents page has file upload tab | Same |
| 30 | `file-upload.spec.ts:29` — scanned docs upload button accessible | Same |
| 31 | `file-upload.spec.ts:38` — file input accepts document types | Same |

**Common root cause:** All 31 failures share the same signature — after `loginPage.login('test@example.com', 'password123')`, the page navigates to `https://localhost/login` instead of the expected `/onboarding` or `/boards` route. The 15-second `waitForURL` timeout fires because the SPA's auth session (`XSRF-TOKEN` / Sanctum) is not being accepted post-login, causing the app to redirect back to login.

## Analysis

- **All 18 passing tests** are auth-light: they either don't require login, test the login form itself (validation errors, empty submit), or test the registration flow end-to-end (which creates its own session).
- **All 31 failing tests** require an authenticated session that survives beyond the initial login call. The Sanctum SPA authentication handshake (`/sanctum/csrf-cookie` → POST `/login` → cookie-based session) appears to complete but the SPA does not recognize the session as valid on subsequent navigations — the client-side router redirects back to `/login`.
- This is a **systemic regression**: the `Sanctum stateful domains` / `CORS` fix in 17bdac9 likely resolved the preflight but introduced a cookie domain mismatch (or the SPA's `withCredentials` configuration does not match the API's `SESSION_DOMAIN` / `SANCTUM_STATEFUL_DOMAINS`).

## Recommendation

Investigate the SPA's authentication guard logic. The Laravel backend returns a `200` on POST `/login` (the `auth.spec.ts` simple login passes), but the Axios/Fetch interceptor on the frontend is not receiving the expected `Set-Cookie` for the application session, or the cookie's `Domain`/`SameSite` attributes are incompatible with the dev server origin (`localhost:3000`). Check `SESSION_DOMAIN` in `.env` matches the dev URL and verify `SANCTUM_STATEFUL_DOMAINS` includes `localhost:3000`.
