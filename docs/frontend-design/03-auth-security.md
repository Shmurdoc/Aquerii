# Aquerii Auth & Security — Production Spec

## Purpose

Every auth route is a chokepoint. Errors here leak user data, allow unauthorized access, or lock paying customers out of their workspace. This spec covers login, registration, password recovery, MFA, onboarding, session management, RBAC gating, and token lifecycle with zero tolerance for UI flickering or token state drift.

---

## API Contract

### Auth Endpoints

#### POST /api/auth/login
```json
// Request
{ "email": "user@example.com", "password": "***", "remember_me": false }
// Response (200) — MFA not required
{ "user": { "id", "name", "email", "avatar_url", "role" }, "token": "eyJ...", "workspace": { "id", "name", "plan" }, "mfa_required": false }
// Response (200) — MFA required
{ "user": { "id", "email" }, "mfa_required": true }
// Response (401)
{ "error": "Invalid email or password" }
// Response (429)
{ "error": "Too many attempts. Try again in 30 seconds." }
```

#### POST /api/auth/register
```json
// Request
{ "name": "Jane", "email": "jane@co.com", "password": "Str0ng!Pass", "workspace_name": "Jane Co", "org_size": "1-10", "terms_accepted": true }
// Response (201)
{ "user": { "id", "name", "email", "role": "owner" }, "token": "eyJ...", "workspace": { "id", "name", "plan": "free" } }
```

#### POST /api/auth/logout
```json
// Request: Authorization header
// Response (204): No content
```

#### POST /api/auth/refresh-token
```json
// Request: { "refresh_token": "..." } // httpOnly cookie
// Response (200): { "token": "eyJ..." }
```

#### POST /api/auth/forgot-password
```json
// Request: { "email": "user@example.com" }
// Response (200): { "message": "If an account exists, a reset email has been sent." }
// Response is the SAME whether email exists or not (prevent enumeration)
```

#### POST /api/auth/reset-password
```json
// Request: { "token": "reset-token-from-url", "password": "NewStr0ng!Pass" }
// Response (200): { "message": "Password reset successful" }
// Response (400): { "error": "Invalid or expired reset token" }
```

#### POST /api/auth/2fa/setup
```json
// Response (200): { "qr_code": "data:image/png;base64,...", "secret": "JBSWY3DPEHPK3PXP", "recovery_codes": ["code1", ..., "code10"] }
```

#### POST /api/auth/2fa/challenge
```json
// Request: { "email": "user@example.com", "code": "123456" }
// Response (200): { "token": "eyJ..." }
// Response (401): { "error": "Invalid code" }
```

#### POST /api/auth/2fa/verify
```json
// Request: { "code": "123456" } // Authorization header
// Response (200): { "verified": true }
```

### Onboarding Endpoints

#### GET /api/onboarding/status
```json
// Response: { "completed": false, "steps": ["profile", "workspace_setup", "invite_team", "feature_tour", "preferences"] }
```

#### POST /api/onboarding/complete
```json
// Response (200): { "completed": true }
```

#### POST /api/onboarding/skip
```json
// Response (200): { "completed": true, "skipped": true }
```

### Session Management (Settings)

#### GET /api/settings/sessions
```json
// Response: { "sessions": [{ "id", "device", "browser", "ip", "location", "last_active", "current": true }] }
```

#### DELETE /api/settings/sessions/{id}
```json
// Response (204)
```

---

## Component Tree

```
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
<Route path="/2fa/setup" element={<TwoFactorSetup />} />
<Route path="/2fa/challenge" element={<TwoFactorChallenge />} />
<Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
<Route path="/settings/security" element={<PrivateRoute><SessionManager /></PrivateRoute>} />
```

### LoginPage

```
<LoginPage>
  <AuthLayout>  ← centered card, max-w-md, workspace logo at top
    <Card>
      <CardHeader>
        <Logo />
        <Heading>Sign in to Aquerii</Heading>
        <Text>Enter your credentials to continue</Text>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin}>
          <FormField name="email" label="Email" error={errors.email}>
            <Input type="email" placeholder="name@company.com" autoComplete="email" />
          </FormField>
          <FormField name="password" label="Password" error={errors.password}>
            <Input type="password" autoComplete="current-password" />
            <Link to="/forgot-password">Forgot password?</Link>
          </FormField>
          <FormField name="remember_me">
            <Checkbox label="Remember me" />
          </FormField>
          <Button type="submit" loading={isPending} fullWidth>
            Sign in
          </Button>
        </form>
        <Divider text="Or continue with" />
        <SocialButtons>
          <SSOButton provider="google" onClick={handleGoogleSSO} />
          <SSOButton provider="azure-ad" onClick={handleAzureSSO} />
          <SSOButton provider="okta" onClick={handleOktaSSO} />
        </SocialButtons>
      </CardContent>
      <CardFooter>
        <Text>Don't have an account? <Link to="/register">Sign up</Link></Text>
      </CardFooter>
    </Card>
  </AuthLayout>
</LoginPage>
```

### RegisterPage

```
<RegisterPage>
  <AuthLayout>
    <Card>
      <CardHeader>
        <Heading>Create your workspace</Heading>
        <Text>Get started with Aquerii in under a minute</Text>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister}>
          <FormField name="name" label="Full name" error={errors.name}>
            <Input placeholder="Jane Smith" autoComplete="name" />
          </FormField>
          <FormField name="email" label="Work email" error={errors.email}>
            <Input type="email" placeholder="jane@company.com" autoComplete="email" />
          </FormField>
          <FormField name="password" label="Password" error={errors.password}>
            <Input type="password" autoComplete="new-password" />
            <PasswordStrengthIndicator value={password} />
          </FormField>
          <FormField name="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
            <Input type="password" autoComplete="new-password" />
          </FormField>
          <FormField name="workspace_name" label="Workspace name" error={errors.workspace_name}>
            <Input placeholder="Jane's Company" />
          </FormField>
          <FormField name="org_size" label="Organization size" error={errors.org_size}>
            <Select>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-1000">201-1000 employees</option>
              <option value="1000+">1000+ employees</option>
            </Select>
          </FormField>
          <FormField name="terms" error={errors.terms}>
            <Checkbox label="I accept the Terms of Service and Privacy Policy" />
          </FormField>
          <Button type="submit" loading={isPending} fullWidth>
            Create workspace
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        Already have an account? <Link to="/login">Sign in</Link>
      </CardFooter>
    </Card>
  </AuthLayout>
</RegisterPage>
```

### ForgotPasswordPage

```
<ForgotPasswordPage>
  <AuthLayout>
    {step === 'email' && (
      <Card>
        <CardHeader>
          <Heading>Reset your password</Heading>
          <Text>Enter your email and we'll send you a reset link</Text>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <FormField name="email" error={errors.email}>
              <Input type="email" placeholder="name@company.com" />
            </FormField>
            <Button type="submit" loading={isPending} fullWidth>Send reset link</Button>
          </form>
        </CardContent>
        <CardFooter>
          <Link to="/login">Back to sign in</Link>
        </CardFooter>
      </Card>
    )}
    {step === 'sent' && (
      <Card>
        <MailSentIcon />
        <Heading>Check your email</Heading>
        <Text>If an account exists for {email}, we've sent a password reset link.</Text>
        <Button variant="ghost" onClick={() => setStep('email')}>
          Send again
        </Button>
      </Card>
    )}
  </AuthLayout>
</ForgotPasswordPage>
```

### ResetPasswordPage

```
<ResetPasswordPage>
  <AuthLayout>
    {step === 'reset' && (
      <Card>
        <CardHeader>
          <Heading>Set new password</Heading>
          <Text>Must be at least 8 characters</Text>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword}>
            <FormField name="password" label="New password" error={errors.password}>
              <Input type="password" />
            </FormField>
            <FormField name="confirmPassword" label="Confirm new password" error={errors.confirmPassword}>
              <Input type="password" />
            </FormField>
            <Button type="submit" loading={isPending} fullWidth>Reset password</Button>
          </form>
        </CardContent>
      </Card>
    )}
    {step === 'success' && (
      <Card>
        <SuccessIcon />
        <Heading>Password reset successful</Heading>
        <Button onClick={() => navigate('/login')}>Sign in with new password</Button>
      </Card>
    )}
    {step === 'invalid' && (
      <Card>
        <ErrorIcon />
        <Heading>Invalid or expired link</Heading>
        <Text>This reset link is no longer valid. Request a new one.</Text>
        <Button onClick={() => navigate('/forgot-password')}>Request new link</Button>
      </Card>
    )}
  </AuthLayout>
</ResetPasswordPage>
```

### TwoFactorSetup

```
<TwoFactorSetup>
  <AuthLayout>
    <Card>
      <CardHeader>
        <Heading>Set up two-factor authentication</Heading>
        <Text>Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password)</Text>
      </CardHeader>
      <CardContent>
        <QRCodeImage src={qr_code} alt="2FA QR code" />
        <div className="flex items-center gap-2">
          <Text variant="muted">Or enter code manually:</Text>
          <CopyButton text={secret} />
          <code className="text-monospace">{secret}</code>
        </div>

        <Separator />

        <Heading level={3}>Recovery codes</Heading>
        <Text>Save these codes in a secure place. Each code can be used once if you lose access to your authenticator.</Text>
        <div className="grid grid-cols-2 gap-2">
          {recoveryCodes.map((code) => (
            <code key={code} className="text-monospace">{code}</code>
          ))}
        </div>
        <Button variant="secondary" onClick={downloadRecoveryCodes}>Download recovery codes</Button>

        <Separator />

        <Heading level={3}>Verify setup</Heading>
        <Text>Enter the 6-digit code from your authenticator app to confirm setup</Text>
        <form onSubmit={handleVerify}>
          <OtpInput length={6} onComplete={handleVerify} />
          <Button type="submit" loading={isPending}>Verify & enable</Button>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</TwoFactorSetup>
```

### TwoFactorChallenge

```
<TwoFactorChallenge>
  <AuthLayout>
    <Card>
      <CardHeader>
        <ShieldIcon />
        <Heading>Two-factor authentication</Heading>
        <Text>Enter the code from your authenticator app</Text>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChallenge}>
          <OtpInput length={6} onComplete={handleChallenge} autoSubmit />
          <Button type="submit" loading={isPending} fullWidth>Verify</Button>
        </form>
        <Link to="/2fa/challenge?mode=backup">Use a recovery code instead</Link>
        <Text variant="muted">
          {mode === 'backup' && (
            <Input placeholder="Enter one of your recovery codes" />
          )}
        </Text>
      </CardContent>
    </Card>
  </AuthLayout>
</TwoFactorChallenge>
```

### OnboardingPage

Multi-step wizard with step indicator at top:

```
<OnboardingPage>
  <OnboardingLayout>
    <StepIndicator steps={steps} currentStep={currentStep} />

    {currentStep === 0 && <ProfilePhotoStep onNext={...} />}
    {currentStep === 1 && <WorkspaceSetupStep onNext={...} />}
    {currentStep === 2 && <InviteTeamStep onNext={...} />}
    {currentStep === 3 && <FeatureTourStep onNext={...} />}
    {currentStep === 4 && <PreferencesStep onComplete={...} />}

    <OnboardingFooter>
      <Button variant="ghost" onClick={skipOnboarding}>Skip for now</Button>
      <Button onClick={handleNext}>{isLastStep ? 'Complete' : 'Next'}</Button>
    </OnboardingFooter>
  </OnboardingLayout>
</OnboardingPage>
```

### SessionManager (Settings page)

```
<SessionManager>
  <PageHeader>
    <Heading>Active sessions</Heading>
    <Text>Sessions are shown for your account across all devices</Text>
  </PageHeader>
  <Card>
    <CardContent>
      {sessions.map((session) => (
        <SessionItem key={session.id}>
          <DeviceIcon type={session.device} />
          <div>
            <Text strong>{session.device} — {session.browser}</Text>
            <Text variant="muted">{session.ip} · {session.location} · Last active {formatRelativeTime(session.last_active)}</Text>
          </div>
          {session.current && <Badge variant="success">Current session</Badge>}
          {!session.current && (
            <Button variant="danger" size="sm" onClick={() => revokeSession(session.id)}>
              Revoke
            </Button>
          )}
        </SessionItem>
      ))}
    </CardContent>
  </Card>
</SessionManager>
```

---

## UI States

### Login — Error States

| Condition | UX |
|-----------|----|
| Invalid credentials | Inline error below form: "Invalid email or password." Inputs shake subtly. No distinction between "email doesn't exist" and "wrong password" to prevent enumeration. |
| Account locked (too many attempts) | Error: "Too many login attempts. Please try again in 30 seconds." Countdown timer on button. |
| Network error | Toast: "Connection error. Please check your internet." Retry button. |
| Rate limited (429) | Toast with retry-after duration. |
| MFA required | Form disappears, smooth transition to MFA challenge view. No back button (user must complete MFA or restart login). |
| Validation errors | Per-field Zod errors shown inline on blur. Submit blocked until all fields valid. |

### Login — Loading

Button shows spinner, inputs disabled, "Signing in..." text. No double-submit possible (button disabled while `isPending`).

### Registration — Edge Cases

| Condition | UX |
|-----------|----|
| Email already registered | Error: "An account with this email already exists. Sign in instead." Link to /login. |
| Weak password | PasswordStrengthIndicator shows strength bar (red/orange/yellow/green). Submit blocked until moderate+. |
| Terms not accepted | Checkbox error shown inline. |
| Workspace name taken | Error: "A workspace with this name already exists." Suggest alternatives. |

### MFA Challenge — States

| Condition | UX |
|-----------|----|
| Auto-submit on 6 digits | First input focuses on mount. Each digit auto-tabs to next. On 6th digit, form submits automatically. No button press needed. |
| Invalid code | Input border turns red, shake animation, input clears, error text appears. |
| Recovery code success | Proceed to workspace. Recovery code consumed server-side. |
| Recovery code invalid | Same as invalid code. |
| Too many failed attempts | After 5 failed MFA attempts, session locked for 60 seconds. Countdown displayed. |

### Onboarding — States

| Condition | UX |
|-----------|----|
| Skipped | POST /api/onboarding/skip → navigate to workspace home. |
| Completed all steps | POST /api/onboarding/complete → navigate to workspace home with "🎉 Workspace ready!" toast. |
| User navigates away mid-onboarding | Progress saved in TanStack Query cache. On return, resume from incomplete step. No server-side step persistence (GET /onboarding/status only returns completed/not-completed). |

### Session Manager — States

| Condition | UX |
|-----------|----|
| Session revoked successfully | Remove from list instantly (optimistic). Toast: "Session revoked." |
| Revoke fails | Restore session in list. Toast: "Failed to revoke session." |
| Current session revoked | Not possible from UI — button is hidden for current session. |

---

## Token Refresh Strategy

```typescript
// src/lib/api.ts — axios instance
import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Request interceptor: attach auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 with silent refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
        const newToken = data.token;
        useAuthStore.getState().setToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

**Key behaviors**:
- Silent refresh uses POST /api/auth/refresh-token with the httpOnly refresh cookie (not accessible from JS)
- Concurrent 401 requests are queued — only one refresh call is made
- If refresh fails (token expired, revoked), redirect to login
- The old token is invalidated server-side on refresh (rotation)
- `useAuthStore.logout()` clears Zustand state and redirects

---

## Role-Based UI Gating

```typescript
// src/hooks/usePermissions.ts
type Role = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  member: 40,
  viewer: 20,
};

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const role = user?.role ?? 'viewer';
  const roleLevel = ROLE_HIERARCHY[role];

  return {
    role,
    can: {
      inviteMembers: roleLevel >= ROLE_HIERARCHY.admin,
      removeMembers: roleLevel >= ROLE_HIERARCHY.admin,
      manageRoles: roleLevel >= ROLE_HIERARCHY.owner,
      deleteBoard: roleLevel >= ROLE_HIERARCHY.admin,
      createBoard: roleLevel >= ROLE_HIERARCHY.member,
      editItem: roleLevel >= ROLE_HIERARCHY.member,
      deleteItem: roleLevel >= ROLE_HIERARCHY.manager,
      viewSettings: roleLevel >= ROLE_HIERARCHY.admin,
      manageBilling: roleLevel >= ROLE_HIERARCHY.owner,
      viewReports: roleLevel >= ROLE_HIERARCHY.member,
      manageAutomation: roleLevel >= ROLE_HIERARCHY.admin,
    },
  };
}
```

Usage pattern — hide UI, not just disable it:

```tsx
function DeleteBoardButton({ boardId }) {
  const { can } = usePermissions();
  if (!can.deleteBoard) return null;
  return <Button variant="danger" onClick={handleDelete}>Delete board</Button>;
}
```

Role is included in the JWT token claims and the `/api/auth/me` response. Zustand store updates role on login and on workspace switch.

---

## MFA Flow (Complete Sequence)

```
User submits login form
  ├─ POST /api/auth/login { email, password, remember_me }
  │   ├─ 200, mfa_required=false → store token, redirect to workspace
  │   └─ 200, mfa_required=true  → navigate to /2fa/challenge?email=X
  │
  ├─ User enters code on challenge page
  │   ├─ POST /api/auth/2fa/challenge { email, code }
  │   │   ├─ 200 → store token, redirect to workspace
  │   │   └─ 401 → show error, clear input, retry
  │   │
  │   └─ User clicks "Use recovery code"
  │       POST /api/auth/2fa/challenge { email, code: recoveryCode }
  │       ├─ 200 → same as above
  │       └─ 401 → "Invalid recovery code. Codes are single-use."
  │
  └─ Setup flow (from security settings)
      GET /api/auth/2fa/setup → show QR + recovery codes
      POST /api/auth/2fa/verify { code } → enable 2FA
```

---

## Performance Considerations

1. **Auth pages are fully client-rendered.** No SSR needed. They are tiny (LoginPage is ~15KB JS gzipped). Route-level code splitting ensures auth JS is only loaded on unauthenticated routes.

2. **Zod validation is synchronous.** The Zod schemas for login/register are defined at module level, instantiated once. Validation runs on blur and on submit — zero network calls for validation.

3. **Password strength indicator uses zxcvbn.** It's 30KB gzipped. We load it lazily only when the password field is focused (`React.lazy` for the indicator component). It does NOT block form submission.

4. **OtpInput (6-digit MFA) is a pre-built lightweight component.** It's 2KB. Not using a heavy library. Each digit field auto-focuses to the next on input.

5. **No animation on auth pages beyond micro-interactions.** Login page should paint in <200ms. No page transitions, no parallax, no complex animations. Speed > delight on auth.

6. **QR code is rendered client-side.** The server returns a base64 PNG data URL. No third-party QR generation on the client. The image is cached after first load.

7. **Social SSO buttons are placeholders with pre-connected providers.** They show the provider icon and name but the actual OAuth flow is not implemented yet. Each button logs: "SSO: redirecting to {provider}" and calls a placeholder redirect. This prevents broken UI when SSO is not configured in self-hosted deployments.

---

## Brutal Notes

1. **"Remember me" is NOT "stay logged in forever."** It sets a longer refresh token expiry (30 days vs 24 hours). The access token still expires in 15 minutes regardless. Do NOT store long-lived access tokens. If the access token is compromised, the window of exposure is 15 minutes max.

2. **The forgot-password response is deliberately identical for found/not-found emails.** If we say "Email sent" vs "Account not found", attackers enumerate valid emails. The response text, status code, and timing must be identical. Use a constant-time comparison on the server side for the same reason.

3. **Token refresh mutex is critical.** Without the isRefreshing lock and failedQueue, 15 simultaneous 401 responses would fire 15 refresh calls. The server would invalidate earlier refresh tokens (rotation), causing 14 of 15 calls to fail and log out the user. The queue pattern above is mandatory.

4. **Auth pages must never depend on workspace context.** If the login page accesses `useWorkspaceStore`, it will crash when there is no workspace loaded. Login, register, forgot-password, and reset-password all run independently of any workspace. The auth pages directory has a separate layout that does NOT include AppLayout.

5. **Onboarding progress is NOT persisted per-step on the server.** The `GET /onboarding/status` endpoint only returns a boolean `completed`. If the user refreshes mid-onboarding, they restart from step 1. That is acceptable for a <2-minute wizard. Do not over-engineer step persistence unless analytics shows >10% drop-off.

6. **The OtpInput must NOT prevent form submission on Enter.** Some users prefer typing 6 digits and pressing Enter rather than waiting for auto-submit. Support both paths. The auto-submit fires on the `onChange` event when value.length === 6, but Enter still submits.

7. **Disabling a user from UI (role management) must happen at the workspace member level.** We use `PUT /api/workspaces/{id}/members/{userId}/role` to change role to `viewer` as a soft-disable. There is no "disable user" endpoint because that's a separate user management system for enterprise tier.

8. **The token expiry grace period is 30 seconds.** If the access token expires but the request was in-flight before expiry, the server accepts it within a 30-second window. This prevents race conditions where a token expires between reading it and sending the request.

9. **Rate limit errors on login should be handled gracefully, not as generic 429.** Show a human-readable countdown. "Too many attempts. Try again in 25 seconds." The countdown uses a local timer synced with the server's `Retry-After` header.

10. **Zod validation on the client is for UX, not security.** Server-side validation is the source of truth. Client-side Zod errors should never block a request — if the client schema is outdated, the server returns 400 and we show the server error.

---

## Build Status (v0.1 — May 28, 2026)

| Page | File | Status | Notes |
|------|------|--------|-------|
| LoginPage | `pages/auth/LoginPage.tsx` | ✅ Upgraded | Input/Button/Checkbox components, error display, MFA redirect |
| RegisterPage | `pages/auth/RegisterPage.tsx` | ✅ Upgraded | Input/Button components, password strength hint |
| ForgotPasswordPage | `pages/auth/ForgotPasswordPage.tsx` | ✅ Upgraded | Input/Button components, success state |
| ResetPasswordPage | `pages/auth/ResetPasswordPage.tsx` | ✅ Upgraded | Input/Button, Zod validation, password confirmation |
| TwoFactorSetup | `pages/auth/TwoFactorSetup.tsx` | ✅ Upgraded | QR code, recovery codes copy, verify flow |
| TwoFactorChallenge | `pages/auth/TwoFactorChallenge.tsx` | ✅ Upgraded | Auto-submit 6-digit, backup code toggle |
| OnboardingPage | `pages/onboarding/OnboardingPage.tsx` | ⚠️ Existing | Pre-existing; needs component upgrade in v0.2 |
| SecurityTab | `components/settings/SecurityTab.tsx` | ✅ Upgraded | Tabs layout, Input/Button/Badge/Toggle components, password strength, session detail, audit log search |

### Backend Gaps
- No invite member endpoint (invite uses member add as fallback)
- No GET subscription data endpoint
- No dedicated 2FA disable API (uses auth store toggle)
