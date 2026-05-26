# Frontend Gaps — Implementation Plan

> Stack: React + Vite + TypeScript + Tailwind CSS (raw HTML/tags, no component library)  
> Data: React Query v5 (`@tanstack/react-query`)  
> State: Zustand (`useAuthStore`, `useNotificationStore`)  
> HTTP: `api` axios instance from `src/lib/api.ts`  
> Auth token + workspace header auto-attached by existing request interceptor

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| **Critical** | Auth broken / user cannot use core product |
| **High** | Key feature entirely missing |
| **Medium** | Feature incomplete but workaround exists |
| **Low** | Polish / convenience |

---

## Table of Contents

1. [Auth Gaps](#1-auth-gaps)
2. [Workspace / Invitations](#2-workspace--invitations)
3. [Boards — Column Management](#3-boards--column-management)
4. [Boards — ItemDetailModal Additions](#4-boards--itemdetailmodal-additions)
5. [CRM — Companies Page](#5-crm--companies-page)
6. [CRM — Pipeline & Stage Management](#6-crm--pipeline--stage-management)
7. [CRM — Deal Move Between Pipelines](#7-crm--deal-move-between-pipelines)
8. [AI Surface](#8-ai-surface)
9. [Billing — PayFast Checkout](#9-billing--payfast-checkout)
10. [Notifications — WebSocket & Silent Refresh](#10-notifications--websocket--silent-refresh)
11. [Settings Fixes](#11-settings-fixes)
12. [Priority-Ordered Checklist](#12-priority-ordered-implementation-checklist)
13. [npm Packages Needed](#13-npm-packages-needed)
14. [Performance Considerations](#14-performance-considerations)

---

## 1. Auth Gaps

### 1.1 Silent Token Refresh (401 Interceptor)

**Priority: Critical**  
**File to modify:** `services/web/src/lib/api.ts`

The current response interceptor calls `logout()` on every 401. It must first attempt a token refresh before giving up.

**API call:** `POST /auth/refresh` — no body required; the server reads the HttpOnly refresh-cookie (set at login).

**Implementation:**

```typescript
// src/lib/api.ts — replace the existing 401 handler block

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(token: string) {
  refreshQueue.forEach(cb => cb(token))
  refreshQueue = []
}

api.interceptors.response.use(
  res => res,
  async err => {
    const status = err.response?.status
    const code   = err.response?.data?.error?.code
    const original = err.config

    if (status === 401 && code !== 'MFA_REQUIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry  = true
      isRefreshing     = true

      try {
        const res  = await api.post('/auth/refresh')
        const newToken = res.data.data.token as string
        useAuthStore.getState().setAuth(
          newToken,
          useAuthStore.getState().user!,
          useAuthStore.getState().workspace!
        )
        processQueue(newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    // ... existing 402 / 429 / 503 handling unchanged
  }
)
```

**State management:** Uses `useAuthStore.getState()` directly (not a hook — called outside React). Updates token in Zustand + sessionStorage via `setAuth`.

**No new hooks needed.**

---

### 1.2 VerifyEmailPage

**Priority: Critical**  
**New file:** `services/web/src/pages/auth/VerifyEmailPage.tsx`  
**Route to add in `App.tsx`:** `/verify-email?token=...` (public, under `AuthLayout`)

**API call:** `POST /auth/email/verify` body `{ token: string }`

**New React Query hook** (inline mutation, no shared hook needed):

```typescript
const verify = useMutation({
  mutationFn: (token: string) => api.post('/auth/email/verify', { token }),
})
```

**UI description:**  
Centered card inside `AuthLayout`. On mount, read `?token` from `useSearchParams()` and immediately fire the mutation. Show three states:

1. **Loading** — spinner + "Verifying your email…" in `text-gray-400`
2. **Success** — green checkmark icon (`CheckCircle` from lucide), "Email verified!" heading, `text-green-400`, a "Continue to login" link (`text-indigo-400`)
3. **Error** — red `XCircle` icon, "Verification failed" heading, error message from `err.response?.data?.error?.message`, a "Resend verification email" button that calls `POST /auth/email/resend` with the user's email (ask user to re-enter if token-only route)

```tsx
// src/pages/auth/VerifyEmailPage.tsx
import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token    = params.get('token') ?? ''

  const verify = useMutation({
    mutationFn: () => api.post('/auth/email/verify', { token }),
  })

  useEffect(() => {
    if (token) verify.mutate()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      {verify.isPending && (
        <>
          <Loader2 size={36} className="text-indigo-400 animate-spin" />
          <p className="text-gray-400 text-sm">Verifying your email…</p>
        </>
      )}
      {verify.isSuccess && (
        <>
          <CheckCircle size={40} className="text-green-400" />
          <h2 className="text-lg font-semibold text-white">Email verified!</h2>
          <p className="text-gray-400 text-sm">You can now sign in to your account.</p>
          <Link to="/login"
            className="mt-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
            Continue to login
          </Link>
        </>
      )}
      {verify.isError && (
        <>
          <XCircle size={40} className="text-red-400" />
          <h2 className="text-lg font-semibold text-white">Verification failed</h2>
          <p className="text-gray-400 text-sm">
            {(verify.error as any)?.response?.data?.error?.message ?? 'Invalid or expired link.'}
          </p>
          <Link to="/login" className="text-indigo-400 text-sm hover:underline">Back to login</Link>
        </>
      )}
    </div>
  )
}
```

**App.tsx change:**
```tsx
// Inside the AuthLayout block — add after ResetPasswordPage route
<Route path="/verify-email" element={<VerifyEmailPage />} />
```

---

### 1.3 OAuth / Social Login Buttons on LoginPage

**Priority: High**  
**File to modify:** `services/web/src/pages/auth/LoginPage.tsx`

**API calls:** Social login is typically redirect-based. Use `window.location.href = '/api/auth/google'` (or `/api/auth/github`). The server handles the OAuth dance and redirects back with a token.

**UI description:**  
Add a divider "or continue with" beneath the existing submit button, then two pill-shaped buttons side-by-side:

```tsx
{/* Add at bottom of LoginPage form, after the submit button */}
<div className="relative my-2">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-700" />
  </div>
  <div className="relative flex justify-center">
    <span className="bg-gray-950 px-3 text-xs text-gray-500">or continue with</span>
  </div>
</div>

<div className="flex gap-3">
  <button
    type="button"
    onClick={() => { window.location.href = '/api/auth/google' }}
    className="flex-1 flex items-center justify-center gap-2 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
  >
    {/* Inline SVG Google logo */}
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92..." />
      {/* full Google SVG path */}
    </svg>
    Google
  </button>
  <button
    type="button"
    onClick={() => { window.location.href = '/api/auth/github' }}
    className="flex-1 flex items-center justify-center gap-2 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
  >
    {/* GitHub Octocat SVG */}
    GitHub
  </button>
</div>
```

Add the same block to `RegisterPage.tsx`.

**State management:** No React Query. After redirect callback, the server sets the token in the response; add a `/auth/callback` route that reads URL params (`?token=&user=&workspace=`) and calls `setAuth(...)` then navigates to `/boards`.

**New route:** `services/web/src/pages/auth/OAuthCallbackPage.tsx`

```tsx
export default function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const setAuth  = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  useEffect(() => {
    const token     = params.get('token')
    const user      = JSON.parse(atob(params.get('user') ?? 'e30='))
    const workspace = JSON.parse(atob(params.get('workspace') ?? 'e30='))
    if (token && user.id) {
      setAuth(token, user, workspace)
      navigate('/boards', { replace: true })
    } else {
      navigate('/login?error=oauth_failed', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
}
```

---

## 2. Workspace / Invitations

### 2.1 InvitationAcceptPage

**Priority: Critical**  
**New file:** `services/web/src/pages/auth/InvitationAcceptPage.tsx`  
**Route:** `/invitations/:token/accept` (public, no layout wrapper — or use `AuthLayout`)

**API call:** `POST /invitations/:token/accept` — no body needed; token in URL. Returns `{ token, user, workspace }` for auto-login.

**New hook** (`src/hooks/useSettings.ts` or inline):
```typescript
export function useAcceptInvitation() {
  const setAuth  = useAuthStore(s => s.setAuth)
  return useMutation({
    mutationFn: (token: string) => api.post(`/invitations/${token}/accept`),
    onSuccess: (res) => {
      const { token: authToken, user, workspace } = res.data.data
      setAuth(authToken, user, workspace)
    },
  })
}
```

**UI description:**  
Render inside `AuthLayout`. Show workspace name + inviter name (decoded from a JWT or loaded via `GET /invitations/:token` preview endpoint). Two-state page:

1. **Pending acceptance** — Workspace logo placeholder (initials in `bg-indigo-600` circle), "You've been invited to join **WorkspaceName**", role badge (`bg-indigo-500/20 text-indigo-300 text-xs rounded-full px-2`), a prominent "Accept Invitation" button (`bg-indigo-600 w-full py-2.5 rounded-lg`), and a "Decline" text link.
2. **Success** — Auto-navigate to `/boards` after `setAuth`.

```tsx
// src/pages/auth/InvitationAcceptPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, Users } from 'lucide-react'

export default function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const navigate  = useNavigate()
  const setAuth   = useAuthStore(s => s.setAuth)

  // Preview: load invitation metadata (workspace name, role)
  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api.get(`/invitations/${token}`).then(r => r.data.data),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => api.post(`/invitations/${token}/accept`),
    onSuccess: (res) => {
      const { token: authToken, user, workspace } = res.data.data
      setAuth(authToken, user, workspace)
      navigate('/boards', { replace: true })
    },
  })

  if (isLoading) return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
      <p className="text-gray-400 text-sm">Loading invitation…</p>
    </div>
  )

  if (isError) return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-red-400 text-sm">This invitation is invalid or has expired.</p>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
        {invite?.workspace_name?.[0]?.toUpperCase() ?? <Users size={24} />}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">You're invited!</h2>
        <p className="text-gray-400 text-sm mt-1">
          Join <span className="text-white font-medium">{invite?.workspace_name}</span> as{' '}
          <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs capitalize">
            {invite?.role}
          </span>
        </p>
      </div>
      <button
        onClick={() => accept.mutate()}
        disabled={accept.isPending}
        className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {accept.isPending ? 'Accepting…' : 'Accept Invitation'}
      </button>
      {accept.isError && (
        <p className="text-red-400 text-xs">
          {(accept.error as any)?.response?.data?.error?.message ?? 'Failed to accept invitation.'}
        </p>
      )}
    </div>
  )
}
```

**App.tsx change** (add as public route outside `RequireAuth`):
```tsx
<Route path="/invitations/:token/accept" element={<InvitationAcceptPage />} />
```

---

### 2.2 Pending Invitations Revoke UI in MembersTab

**Priority: Medium**  
**File to modify:** `services/web/src/components/settings/MembersTab.tsx`

The existing `pendingMembers` section renders pending invites but the revoke button calls `removeMember.mutate(member.user_id)` which targets the member endpoint. Pending invitations should call `DELETE /workspaces/:id/invitations/:invitationId`.

**New hook** (add to `src/hooks/useSettings.ts`):
```typescript
export function useRevokeInvitation() {
  const qc        = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.delete(`/workspaces/${workspace!.id}/invitations/${invitationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', workspace?.id] }),
  })
}
```

The `member` objects for pending status need an `invitation_id` field — add it to the `Member` interface in `useSettings.ts`.

**UI change in `MembersTab.tsx`:**  
Replace the existing revoke `<button>` inside the pending section:

```tsx
// Replace: removeMember.mutate(member.user_id)
// With:
revokeInvitation.mutate(member.invitation_id)
```

Also update the pending row to show a resend button:
```tsx
<button
  onClick={() => resendInvitation.mutate(member.invitation_id)}
  className="text-xs text-indigo-400 hover:text-indigo-300"
>
  Resend
</button>
```

Add `useResendInvitation` hook calling `POST /workspaces/:id/invitations/:id/resend`.

---

## 3. Boards — Column Management

**Priority: High**  
**New file:** `services/web/src/components/board/ColumnManagerModal.tsx`  
**File to modify:** `services/web/src/components/board/BoardTopBar.tsx` (add trigger button)

### New Hooks (add to `src/hooks/useBoards.ts`)

```typescript
export function useCreateColumn(boardId: string) {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/columns`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: ({ columnId, data }: { columnId: string; data: Partial<BoardColumn> }) =>
      api.patch(`/workspaces/${workspace!.id}/boards/${boardId}/columns/${columnId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (columnId: string) =>
      api.delete(`/workspaces/${workspace!.id}/boards/${boardId}/columns/${columnId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })
}

export function useReorderColumns(boardId: string) {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/columns/reorder`, { ids: orderedIds }),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ['board', boardId] })
      const prev = qc.getQueryData<Board>(['board', boardId])
      qc.setQueryData<Board>(['board', boardId], old => {
        if (!old) return old
        const reordered = orderedIds
          .map((id, i) => ({ ...old.columns.find(c => c.id === id)!, position: i }))
          .filter(Boolean)
        return { ...old, columns: reordered }
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['board', boardId], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })
}
```

### ColumnManagerModal UI

Full-screen overlay (`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`) containing a `max-w-lg` white-on-dark panel:

```
┌──────────────────────────────────┐
│ Manage Columns            [✕]    │
├──────────────────────────────────┤
│ [⋮⋮] Title          text  [✎][🗑] │
│ [⋮⋮] Status         status[✎][🗑] │
│ [⋮⋮] Priority       select[✎][🗑] │
│ [⋮⋮] Due Date       date  [✎][🗑] │
│ + Add column                     │
└──────────────────────────────────┘
```

Each row:
- Drag handle: `GripVertical` icon, `cursor-grab text-gray-600 hover:text-gray-400`
- Column name: editable inline `<input>` on click, `bg-transparent border-b border-transparent focus:border-indigo-500`
- Type badge: `text-[10px] uppercase text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded`
- Edit (rename) button: `Pencil` icon, `text-gray-500 hover:text-gray-300`
- Delete button: disabled for system columns (`is_system === true`), `Trash2` icon in `text-red-400`

DnD is implemented with `@dnd-kit/core` + `@dnd-kit/sortable` (see [Section 13](#13-npm-packages-needed)):

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableColumnRow({ column, onRename, onDelete }: ...) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg group">
      <span {...attributes} {...listeners} className="cursor-grab text-gray-600 hover:text-gray-400">
        <GripVertical size={14} />
      </span>
      {/* ... rest of row */}
    </div>
  )
}
```

On `DragEndEvent`, extract new order and call `reorderColumns.mutate(newOrderedIds)`.

"Add column" opens an inline form at the bottom:
```tsx
<div className="flex gap-2 mt-3">
  <input placeholder="Column name" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
  <select className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300">
    <option value="text">Text</option>
    <option value="status">Status</option>
    <option value="date">Date</option>
    <option value="person">Person</option>
    <option value="number">Number</option>
    <option value="select">Select</option>
    <option value="url">URL</option>
    <option value="email">Email</option>
    <option value="phone">Phone</option>
    <option value="checkbox">Checkbox</option>
  </select>
  <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded">Add</button>
</div>
```

---

## 4. Boards — ItemDetailModal Additions

### 4.1 Activity Feed / Timeline

**Priority: High**  
**File to modify:** `services/web/src/components/board/ItemDetailModal.tsx`

**New hook** (add to `src/hooks/useItems.ts`):
```typescript
export function useItemActivity(itemId: string) {
  const workspace = useAuthStore(s => s.workspace)
  return useQuery({
    queryKey: ['item-activity', itemId],
    queryFn: () => api.get(`/workspaces/${workspace!.id}/items/${itemId}/activity`)
      .then(r => r.data.data as ActivityEvent[]),
    enabled: !!workspace && !!itemId,
  })
}

export interface ActivityEvent {
  id: string
  type: string        // 'field_changed' | 'comment_added' | 'assignee_added' | 'status_changed' etc.
  user: { id: string; name: string; avatar_url: string | null }
  meta: Record<string, unknown>
  created_at: string
}
```

**UI description:**  
Add an "Activity" tab bar below the description in `ItemDetailModal`. Three tabs: **Description**, **Activity**, **Subitems** — rendered as `<button>` elements with `border-b-2 border-indigo-500` for active state.

Activity tab content:
```
● [Avatar] Jordan changed Status from To Do → In Progress  •  2h ago
● [Avatar] Alex added a comment  •  Yesterday
● [Avatar] Sam attached invoice.pdf  •  3 days ago
```

Each entry:
- Avatar: `InitialsAvatar` component (already exists at `src/components/shared/InitialsAvatar.tsx`)
- Pill describing the change: built from `event.type` + `event.meta` fields
- Relative time: use `formatDistanceToNow` from `date-fns`
- Layout: `flex items-start gap-2.5 py-2 border-b border-gray-800/60 last:border-0`
- User name in `text-gray-200 font-medium`, description in `text-gray-400 text-sm`

---

### 4.2 Subitems (Nested Tasks)

**Priority: High**  
**File to modify:** `services/web/src/components/board/ItemDetailModal.tsx`  
(A `SubItems` component is already referenced at line 182 — implement it properly)

**New hook** (add to `src/hooks/useItems.ts`):
```typescript
export function useSubItems(boardId: string, parentId: string) {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()
  return useQuery({
    queryKey: ['subitems', parentId],
    queryFn: () => api.get(`/workspaces/${workspace!.id}/boards/${boardId}/items`, {
      params: { parent_id: parentId }
    }).then(r => r.data.data as Item[]),
    enabled: !!workspace && !!parentId,
  })
}
```

Create subitem via `useCreateItem(boardId)` with `{ parent_id: parentId, group_id: item.group_id, title }`.

**UI description:**  
Collapsible section within `ItemDetailModal` main column:
```
▶ Subitems (3)
  ☐  Fix login redirect bug        [due: tomorrow]  [Alex]
  ☑  Write unit tests             [done]
  ☐  Update docs                  [no date]
  + Add subitem
```

Each subitem row:
- Checkbox (`<input type="checkbox">` styled with `accent-indigo-500 w-3.5 h-3.5`)
- Title as inline-editable text (`<input>` with `bg-transparent border-b border-transparent focus:border-indigo-500 text-sm`)
- Done state: `line-through text-gray-500`
- Add subitem: an `<input>` that shows on "+ Add subitem" click, submits on Enter, calls `createItem.mutate`

---

### 4.3 Assignee Management

**Priority: High**  
**File to modify:** `services/web/src/components/board/ItemDetailModal.tsx`

Currently the modal shows `item.assignees` read-only. Add add/remove capability.

**New hooks** (add to `src/hooks/useItems.ts`):
```typescript
export function useAddAssignee(boardId: string) {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: ({ itemId, userId }: { itemId: string; userId: string }) =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}/assignees`, { user_id: userId }),
    onSuccess: (_, { itemId }) => {
      qc.invalidateQueries({ queryKey: ['items', boardId] })
    },
  })
}

export function useRemoveAssignee(boardId: string) {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: ({ itemId, userId }: { itemId: string; userId: string }) =>
      api.delete(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}/assignees/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}
```

**UI description:**  
In the right-side metadata panel of `ItemDetailModal`, the "Assignees" field:
- Shows avatar stack of current assignees (overlapping circles, `w-6 h-6 rounded-full`, `ring-2 ring-gray-900 -ml-1.5 first:ml-0`)
- `+` button opens a small popover (`absolute z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-56 p-2`) listing workspace members via `useWorkspaceMembers()`
- Each member row: avatar + name + checkmark if already assigned
- Click to toggle assignment, calling `addAssignee` or `removeAssignee`

---

### 4.4 Duplicate Item Button

**Priority: Medium**  
**File to modify:** `services/web/src/components/board/ItemDetailModal.tsx`

**New hook:**
```typescript
export function useDuplicateItem(boardId: string) {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (itemId: string) =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/items/${itemId}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}
```

**UI:** Add a `Copy` icon button in the modal header action row (alongside the existing delete button). On click, show a brief `toast.success('Item duplicated.')` and invalidate the items query. No confirmation needed.

---

### 4.5 Move Item to Another Board

**Priority: Medium**  
**New file:** `services/web/src/components/board/MoveItemModal.tsx`

**API call:** `POST /workspaces/:id/boards/:boardId/items/:itemId/move-board` body `{ target_board_id, target_group_id }`

**UI description:**  
Small modal (`max-w-sm`) triggered from a "Move to board" option in a `⋯` dropdown menu on `ItemDetailModal`:
1. `<select>` listing all boards from `useBoards()` — filter out current board
2. After board selection, a second `<select>` loads groups of the target board via `useBoard(targetBoardId)` 
3. "Move" button — calls mutation, closes both modals on success

```tsx
// MoveItemModal.tsx
export default function MoveItemModal({ item, boardId, onClose }: Props) {
  const { data: boards = [] } = useBoards()
  const [targetBoardId, setTargetBoardId] = useState('')
  const [targetGroupId, setTargetGroupId] = useState('')
  const { data: targetBoard } = useBoard(targetBoardId)

  const moveToBoard = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspace!.id}/boards/${boardId}/items/${item.id}/move-board`, {
        target_board_id: targetBoardId,
        target_group_id: targetGroupId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', boardId] })
      toast.success('Item moved.')
      onClose()
    },
  })

  const otherBoards = boards.filter(b => b.id !== boardId)

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-100">Move to Board</h3>
        <select value={targetBoardId} onChange={e => { setTargetBoardId(e.target.value); setTargetGroupId('') }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
          <option value="">Select a board…</option>
          {otherBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {targetBoard && (
          <select value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
            <option value="">Select a group…</option>
            {targetBoard.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          <button onClick={() => moveToBoard.mutate()} disabled={!targetBoardId || !targetGroupId || moveToBoard.isPending}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg">
            {moveToBoard.isPending ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 5. CRM — Companies Page

**Priority: High**  
**New file:** `services/web/src/pages/crm/CompaniesPage.tsx`  
**New file:** `services/web/src/components/crm/CompanyDrawer.tsx`  
**New hooks file:** `services/web/src/hooks/useCompanies.ts`  
**Route to add in `App.tsx`:** `/crm/companies`  
**Sidebar link** to add in `src/components/layout/Sidebar.tsx` (under CRM section)

### New Hooks (`src/hooks/useCompanies.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  employee_count: number | null
  created_at: string
  updated_at: string
}

export function useCompanies() {
  const workspace = useAuthStore(s => s.workspace)
  return useQuery({
    queryKey: ['companies', workspace?.id],
    queryFn: () => api.get(`/crm/companies`).then(r => r.data.data as Company[]),
    enabled: !!workspace,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (data: Partial<Company>) => api.post(`/crm/companies`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', workspace?.id] }),
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      api.patch(`/crm/companies/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', workspace?.id] }),
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (id: string) => api.delete(`/crm/companies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies', workspace?.id] }),
  })
}
```

### CompaniesPage UI

Mirrors the style of `ContactsPage.tsx`. Full-width table with sticky header:

```
┌─────────────────────────────────────────────────────────────┐
│ Companies                               [+ New Company]      │
├─────────────────────────────────────────────────────────────┤
│ Search [_________________________]                           │
├────────────┬──────────┬────────────┬────────────┬──────────┤
│ Name       │ Domain   │ Industry   │ Employees  │          │
├────────────┼──────────┼────────────┼────────────┼──────────┤
│ Acme Corp  │ acme.com │ SaaS       │ 50         │ [⋯]      │
│ ...        │ ...      │ ...        │ ...        │          │
└────────────┴──────────┴────────────┴────────────┴──────────┘
```

- Table: `<table className="w-full text-sm">`
- Header: `<thead className="bg-gray-800/60 sticky top-0 z-10">`
- Each `<th>`: `px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold`
- Body rows: `hover:bg-gray-800/40 cursor-pointer transition-colors border-b border-gray-800/50`
- Row click opens `CompanyDrawer` (right-side slide-over: `fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-40 flex flex-col`)

### CompanyDrawer UI

```
┌─────────────────────────────────┐
│ [✕]  Acme Corp                  │
│      acme.com                   │
├─────────────────────────────────┤
│ Industry:    SaaS               │
│ Website:     https://acme.com   │
│ Phone:       +1 555 000 0000    │
│ Address:     123 Main St        │
│ Employees:   50                 │
├─────────────────────────────────┤
│ Linked Contacts (3)             │
│  ● Alice Smith                  │
│  ● Bob Jones                    │
│  ● Carol White                  │
├─────────────────────────────────┤
│ [Edit]               [Delete]   │
└─────────────────────────────────┘
```

Edit mode: each field becomes an `<input>` / `<select>`. Save on blur or explicit "Save" button. Delete requires confirm state: shows `"Are you sure?"` + "Yes, delete" + "Cancel".

---

## 6. CRM — Pipeline & Stage Management

**Priority: High**  
**New file:** `services/web/src/components/crm/PipelineManagerModal.tsx`  
**File to modify:** `services/web/src/pages/crm/CRMPage.tsx` (add "Manage Pipelines" button near pipeline selector)

### New Hooks (add to existing CRM hooks, or new `src/hooks/usePipelines.ts`)

```typescript
export function usePipelines() {
  const workspace = useAuthStore(s => s.workspace)
  return useQuery({
    queryKey: ['pipelines', workspace?.id],
    queryFn: () => api.get(`/crm/pipelines`).then(r => r.data.data as Pipeline[]),
    enabled: !!workspace,
  })
}

export function useCreatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => api.post(`/crm/pipelines`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useUpdatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pipeline> }) =>
      api.patch(`/crm/pipelines/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useDeletePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/crm/pipelines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useCreateStage(pipelineId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; win_probability?: number }) =>
      api.post(`/crm/pipelines/${pipelineId}/stages`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useUpdateStage(pipelineId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: Partial<Stage> }) =>
      api.patch(`/crm/pipelines/${pipelineId}/stages/${stageId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useDeleteStage(pipelineId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stageId: string) =>
      api.delete(`/crm/pipelines/${pipelineId}/stages/${stageId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useReorderStages(pipelineId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.post(`/crm/pipelines/${pipelineId}/stages/reorder`, { ids: orderedIds }),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ['pipelines'] })
      const prev = qc.getQueryData<Pipeline[]>(['pipelines'])
      qc.setQueryData<Pipeline[]>(['pipelines'], old =>
        old?.map(p => p.id !== pipelineId ? p : {
          ...p,
          stages: orderedIds.map((id, i) => ({ ...p.stages.find(s => s.id === id)!, position: i }))
        }) ?? []
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['pipelines'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}
```

### PipelineManagerModal UI

Two-column layout inside a `max-w-2xl` modal:

**Left column** — pipeline list:
```
Sales Pipeline  [default]  [✎] [🗑]
Support Pipeline           [✎] [🗑]
+ New Pipeline
```

**Right column** — stages for selected pipeline (DnD reorderable, same pattern as ColumnManagerModal):
```
[⋮⋮] 🟢 Lead            10%  [✎] [🗑]
[⋮⋮] 🔵 Qualified        30%  [✎] [🗑]
[⋮⋮] 🟡 Proposal         60%  [✎] [🗑]
[⋮⋮] 🔴 Closed Lost       0%  [✎] [🗑]
[⋮⋮] ✅ Closed Won       100%  [✎] [🗑]
+ Add stage
```

Each stage row shows a color dot (implemented as `<span className="w-3 h-3 rounded-full inline-block" style={{ background: stage.color ?? '#6366f1' }}`), stage name, and win probability (`text-xs text-gray-500`).

Inline "Add stage" form at bottom of right column: name input + color picker (`<input type="color" className="w-7 h-7 cursor-pointer rounded">`) + win% number input + "Add" button.

---

## 7. CRM — Deal Move Between Pipelines

**Priority: High**  
**File to modify:** `services/web/src/components/crm/DealDetailModal.tsx`

**API call:** `POST /deals/{deal}/move` body `{ pipeline_id: string, stage_id: string }`

**New hook** (add to CRM hooks):
```typescript
export function useMoveDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dealId, pipelineId, stageId }: { dealId: string; pipelineId: string; stageId: string }) =>
      api.post(`/deals/${dealId}/move`, { pipeline_id: pipelineId, stage_id: stageId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}
```

**UI change in DealDetailModal:**  
In the pipeline/stage section of the deal detail, replace the current static `<select>` (if it exists) or add a new "Move to pipeline" action in the `⋯` menu:

1. A `<select>` for pipeline (all pipelines from `usePipelines()`)
2. A `<select>` for stage (filtered to selected pipeline)
3. On change of pipeline, reset stage selection to first stage of new pipeline
4. "Move" button calls `moveDeal.mutate({ dealId, pipelineId, stageId })`

Optimistic update: before API call, update the deal's `pipeline_id` and `stage_id` in the query cache for the current pipeline's deals query.

---

## 8. AI Surface

### 8.1 AI Chat Sidebar/Panel

**Priority: High**  
**New file:** `services/web/src/components/ai/AIChatPanel.tsx`  
**File to modify:** `services/web/src/layouts/AppLayout.tsx` (add panel toggle + render)

**API call:** `POST /ai/chat` body `{ message: string, thread_id?: string, context?: { type, id } }`  
Response: `{ reply: string, thread_id: string, credits_used: number }`

**New hook** (`src/hooks/useAI.ts`):
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export function useAIChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { message: string; thread_id?: string; context?: { type: string; id: string } }) =>
      api.post('/ai/chat', payload).then(r => r.data.data as { reply: string; thread_id: string; credits_used: number }),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['ai-credits'] })
    },
  })
}

export function useAICredits() {
  const workspace = useAuthStore(s => s.workspace)
  return useQuery({
    queryKey: ['ai-credits', workspace?.id],
    queryFn: () => api.get('/ai/credits').then(r => r.data.data as { remaining: number; total: number }),
    enabled: !!workspace,
  })
}
```

**AIChatPanel UI:**

Slide-over panel on the right side of `AppLayout`, toggled by a `Sparkles` (lucide) button in the `TopBar`. Panel state managed by a new `useAIStore` Zustand store:

```typescript
// src/stores/aiStore.ts
import { create } from 'zustand'

interface AIState {
  open: boolean
  threadId: string | null
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  toggle: () => void
  addMessage: (msg: { role: 'user' | 'assistant'; content: string }) => void
  setThreadId: (id: string) => void
  clear: () => void
}

export const useAIStore = create<AIState>()(set => ({
  open: false,
  threadId: null,
  messages: [],
  toggle: () => set(s => ({ open: !s.open })),
  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  setThreadId: (id) => set({ threadId: id }),
  clear: () => set({ messages: [], threadId: null }),
}))
```

Panel layout (`fixed right-0 inset-y-0 w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-30 shadow-2xl`):
```
┌──────────────────────────────┐
│ ✨ AI Assistant      [✕][🗑]  │
│ Credits: 45 / 100            │
├──────────────────────────────┤
│                              │
│  [assistant bubble]          │
│  How can I help you today?   │
│                              │
│         [user bubble]        │
│    Summarize my open deals   │
│                              │
│  [assistant bubble]          │
│  You have 5 open deals...    │
│                              │
├──────────────────────────────┤
│ [___________________________]│
│ [Send]                       │
└──────────────────────────────┘
```

Bubbles:
- User: `ml-auto max-w-[75%] bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-3.5 py-2`
- Assistant: `mr-auto max-w-[75%] bg-gray-800 text-gray-200 text-sm rounded-2xl rounded-bl-sm px-3.5 py-2`

On submit: push user message to `messages`, call `useAIChat`, push assistant reply, update `threadId`.

Typing indicator (while `isPending`): three animated dots `animate-bounce` in an assistant bubble.

---

### 8.2 AI Credits Display

**Priority: Medium**  
**File to modify:** `services/web/src/components/layout/TopBar.tsx`

Add a credits pill near the TopBar right side, adjacent to the Sparkles button:

```tsx
const { data: credits } = useAICredits()

{credits && (
  <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-1">
    <Sparkles size={11} className="text-indigo-400" />
    <span>{credits.remaining}</span>
    <span className="text-gray-600">/</span>
    <span className="text-gray-500">{credits.total}</span>
  </div>
)}
```

---

### 8.3 "Generate Description" in ItemDetailModal

**Priority: Medium**  
**File to modify:** `services/web/src/components/board/ItemDetailModal.tsx`

**API call:** `POST /ai/generate` body `{ type: 'item_description', context: { item_title: string, board_name: string } }`

**New hook** (add to `src/hooks/useAI.ts`):
```typescript
export function useAIGenerate() {
  return useMutation({
    mutationFn: (payload: { type: string; context: Record<string, unknown> }) =>
      api.post('/ai/generate', payload).then(r => r.data.data.content as string),
  })
}
```

**UI:** Add a small `Sparkles` icon button to the right of the "Description" label:
```tsx
<button
  onClick={() => generateDesc.mutate({ type: 'item_description', context: { item_title: title, board_name: boardName } })}
  disabled={generateDesc.isPending}
  className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
  title="Generate with AI"
>
  {generateDesc.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
</button>
```

On success, set the `description` state with the returned string and call `updateItem.mutate({ description: generatedText })`.

---

### 8.4 "Generate Document" in DocumentPage

**Priority: Medium**  
**File to modify:** `services/web/src/pages/documents/DocumentPage.tsx`

**API call:** `POST /ai/generate` body `{ type: 'document', context: { title: string, outline?: string } }`

**UI:** Add a `Sparkles` button in the document toolbar. On click, open a small popover (`absolute bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl w-64 z-20`) with:
- A textarea for the user to provide an outline or topic hint
- "Generate" button

On success, insert the generated markdown into the document editor (Tiptap). Call the editor's `commands.setContent()` method.

---

### 8.5 "Generate Automation" in AutomationPage

**Priority: Low**  
**File to modify:** `services/web/src/pages/automation/AutomationPage.tsx`  
**File to modify:** `services/web/src/components/automation/RuleBuilderModal.tsx`

**API call:** `POST /ai/generate` body `{ type: 'automation_rule', context: { description: string } }`

**UI:** Add a "Generate with AI" tab or toggle at the top of `RuleBuilderModal`. In AI mode:
- A `<textarea>` asking "Describe the automation in plain English"
- Example: "When a deal is moved to Closed Won, notify the account manager via email"
- "Generate Rule" button calls the AI endpoint, which returns a structured rule JSON
- The returned rule JSON is used to pre-fill the manual rule builder fields

---

### 8.6 Deal Summarize Action in DealDetailModal

**Priority: Medium**  
**File to modify:** `services/web/src/components/crm/DealDetailModal.tsx`

**API call:** `POST /ai/generate` body `{ type: 'deal_summary', context: { deal_id: string } }`

**UI:** Add a `Sparkles` button in the DealDetailModal header actions area. On click, display a collapsible "AI Summary" section below the deal title:
- Loading state: skeleton shimmer `animate-pulse bg-gray-800 rounded h-16`
- Result: a gray info box `bg-gray-800/60 border border-gray-700 rounded-lg p-3 text-sm text-gray-300`
- A "Regenerate" link (`text-xs text-indigo-400 hover:underline`)

---

## 9. Billing — PayFast Checkout

**Priority: High**  
**File to modify:** `services/web/src/components/settings/BillingTab.tsx`

**API call:** `POST /billing/payfast/checkout` body `{ plan: string }` → returns `{ redirect_url: string }`

**New hook:**
```typescript
export function usePayFastCheckout() {
  return useMutation({
    mutationFn: (plan: string) =>
      api.post('/billing/payfast/checkout', { plan }).then(r => r.data.data.redirect_url as string),
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: () => toast.error('Failed to initiate checkout. Please try again.'),
  })
}
```

**UI description:**  
In `BillingTab.tsx`, for each plan tier card, add a "Upgrade" / "Subscribe" button at the bottom. The card layout:
```
┌─────────────────────────────┐
│ Pro                         │
│ R499 / month                │
│                             │
│ ✓ Unlimited boards          │
│ ✓ 10 members                │
│ ✓ 1,000 AI credits          │
│ ✓ Priority support          │
│                             │
│ [Subscribe via PayFast]     │
└─────────────────────────────┘
```

Button:
```tsx
<button
  onClick={() => checkout.mutate('pro')}
  disabled={checkout.isPending}
  className="w-full mt-auto py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
>
  {checkout.isPending ? 'Redirecting…' : 'Subscribe via PayFast'}
</button>
```

Show current plan badge on the active plan card: `ring-2 ring-indigo-500` border, and replace the button with `<span className="w-full text-center text-xs text-indigo-400">Current Plan</span>`.

---

## 10. Notifications — WebSocket & Silent Refresh

### 10.1 WebSocket Connection in NotificationPanel

**Priority: High**  
**File to modify:** `services/web/src/components/notifications/NotificationPanel.tsx`  
**File to modify:** `services/web/src/hooks/useNotifications.ts`

The `useNotifications` hook uses REST polling. Add WebSocket subscription using the existing `getSocket()` from `src/lib/socket.ts`:

```typescript
// Add to useNotifications.ts
import { getSocket } from '@/lib/socket'

export function useNotificationSocket() {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)

  useEffect(() => {
    if (!workspace) return
    const socket = getSocket()
    const room = `workspace:${workspace.id}:notifications`

    socket.emit('room:join', { room })

    const handler = (event: { type: string }) => {
      if (event.type === 'notification.created') {
        qc.invalidateQueries({ queryKey: ['notifications'] })
        // Also increment unread count in notificationStore
        useNotificationStore.getState().incrementUnread()
      }
    }
    socket.on('event', handler)

    return () => {
      socket.emit('room:leave', { room })
      socket.off('event', handler)
    }
  }, [workspace?.id, qc])
}
```

Call `useNotificationSocket()` inside `NotificationPanel` component (or in `AppLayout` to ensure it's always active).

### 10.2 Silent Notification Refresh

**Priority: Medium**  
**File to modify:** `services/web/src/hooks/useNotifications.ts`

Add `refetchInterval` to the notifications query for background polling (fallback when WebSocket is unavailable):

```typescript
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
    refetchInterval: 30_000,           // 30s polling fallback
    refetchIntervalInBackground: false, // only poll when tab is visible
    staleTime: 20_000,
  })
}
```

---

## 11. Settings Fixes

### 11.1 MFA Flow — Correct Endpoint

**Priority: High**  
**File to modify:** `services/web/src/components/settings/SecurityTab.tsx`

Current code uses `/user/two-factor-*` endpoints. Change to `/auth/mfa/*`:

| Current (wrong) | Correct |
|----------------|---------|
| `POST /user/two-factor-authentication` | `POST /auth/mfa/enable` |
| `DELETE /user/two-factor-authentication` | `POST /auth/mfa/disable` |
| `GET /user/two-factor-qr-code` | `GET /auth/mfa/qr-code` |
| `POST /user/confirmed-two-factor-authentication` | `POST /auth/mfa/confirm` |
| `GET /user/two-factor-recovery-codes` | `GET /auth/mfa/recovery-codes` |

**New hooks** (add to `src/hooks/useSettings.ts` or new `src/hooks/useMFA.ts`):

```typescript
export function useMFASetup() {
  return useMutation({
    mutationFn: () => api.post('/auth/mfa/enable'),
  })
}

export function useMFAQRCode() {
  return useQuery({
    queryKey: ['mfa-qr-code'],
    queryFn: () => api.get('/auth/mfa/qr-code').then(r => r.data.data.svg as string),
    enabled: false, // triggered manually
  })
}

export function useMFAConfirm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => api.post('/auth/mfa/confirm', { code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mfa-qr-code'] })
      useAuthStore.getState().setUser({
        ...useAuthStore.getState().user!,
        mfa_enabled: true,
      })
    },
  })
}

export function useMFADisable() {
  return useMutation({
    mutationFn: (password: string) => api.post('/auth/mfa/disable', { password }),
    onSuccess: () => {
      useAuthStore.getState().setUser({
        ...useAuthStore.getState().user!,
        mfa_enabled: false,
      })
    },
  })
}

export function useMFARecoveryCodes() {
  return useQuery({
    queryKey: ['mfa-recovery-codes'],
    queryFn: () => api.get('/auth/mfa/recovery-codes').then(r => r.data.data.codes as string[]),
    enabled: false,
  })
}
```

### 11.2 Password Change

**Priority: Medium**  
**File to modify:** `services/web/src/components/settings/SecurityTab.tsx`

The password change UI exists but calls a non-existent endpoint. The correct endpoint based on standard Laravel Sanctum pattern is `PUT /user/password` (or `POST /auth/password/change`). Confirm with backend team.

**Interim hook:**
```typescript
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; password: string; password_confirmation: string }) =>
      api.put('/user/password', data),
    onSuccess: () => toast.success('Password updated.'),
    onError: (err: any) => toast.error(err.response?.data?.error?.message ?? 'Failed to update password.'),
  })
}
```

### 11.3 Notification Preferences

**Priority: Low**  
**File to modify:** `services/web/src/components/settings/NotificationsTab.tsx`

Endpoint needed: `GET /user/notification-preferences` and `PUT /user/notification-preferences`.

```typescript
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/user/notification-preferences').then(r => r.data.data),
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prefs: Record<string, boolean>) =>
      api.put('/user/notification-preferences', prefs),
    onMutate: async (newPrefs) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['notification-preferences'] })
      const prev = qc.getQueryData(['notification-preferences'])
      qc.setQueryData(['notification-preferences'], (old: any) => ({ ...old, ...newPrefs }))
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['notification-preferences'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
  })
}
```

### 11.4 Session Management

**Priority: Low**  
**File to modify:** `services/web/src/components/settings/SecurityTab.tsx`

Backend endpoint `/user/sessions` is missing from `api.php`. Once added:

```typescript
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/user/sessions').then(r => r.data.data),
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.delete(`/user/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}
```

**UI:** A table listing active sessions (device, IP, last active timestamp). Each row has a "Revoke" button (`text-red-400 hover:text-red-300 text-xs`). Current session row is marked with a `(current)` badge and has no revoke button.

### 11.5 Workspace Logo Upload

**Priority: Medium**  
**File to modify:** `services/web/src/components/settings/GeneralTab.tsx`

**API calls:**
- `POST /workspaces/:id/logo` (multipart/form-data, field `logo`)
- `DELETE /workspaces/:id/logo`

```typescript
export function useUploadWorkspaceLogo() {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('logo', file)
      return api.post(`/workspaces/${workspace!.id}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (res) => {
      const updatedWorkspace = res.data.data
      useAuthStore.getState().setWorkspace(updatedWorkspace)
      qc.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
}

export function useRemoveWorkspaceLogo() {
  const workspace = useAuthStore(s => s.workspace)
  return useMutation({
    mutationFn: () => api.delete(`/workspaces/${workspace!.id}/logo`),
    onSuccess: (res) => {
      useAuthStore.getState().setWorkspace(res.data.data)
    },
  })
}
```

**UI in GeneralTab:**
```tsx
<div className="flex items-center gap-4">
  {/* Logo preview */}
  <div className="w-16 h-16 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center">
    {workspace?.logo_url
      ? <img src={workspace.logo_url} alt="Logo" className="w-full h-full object-cover" />
      : <span className="text-2xl font-bold text-gray-400">{workspace?.name[0]}</span>
    }
  </div>
  <div className="flex flex-col gap-1.5">
    <button onClick={() => logoInputRef.current?.click()}
      className="text-sm px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
      Upload logo
    </button>
    {workspace?.logo_url && (
      <button onClick={() => removeLogo.mutate()}
        className="text-xs text-red-400 hover:text-red-300">
        Remove
      </button>
    )}
    <p className="text-[11px] text-gray-600">PNG, JPG, SVG — max 2 MB</p>
  </div>
  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
    onChange={e => e.target.files?.[0] && uploadLogo.mutate(e.target.files[0])} />
</div>
```

---

## 12. Priority-Ordered Implementation Checklist

### Phase 1 — Critical (ship immediately)

- [ ] `src/lib/api.ts` — Add silent token refresh interceptor (Section 1.1)
- [ ] `src/pages/auth/VerifyEmailPage.tsx` — Create email verification page (Section 1.2)
- [ ] `src/App.tsx` — Register `/verify-email` and `/invitations/:token/accept` routes
- [ ] `src/pages/auth/InvitationAcceptPage.tsx` — Create invitation accept page (Section 2.1)

### Phase 2 — High (next sprint)

- [ ] `src/pages/auth/LoginPage.tsx` — Add Google/GitHub OAuth buttons (Section 1.3)
- [ ] `src/pages/auth/RegisterPage.tsx` — Add OAuth buttons (Section 1.3)
- [ ] `src/pages/auth/OAuthCallbackPage.tsx` — Create OAuth callback handler (Section 1.3)
- [ ] `src/components/settings/SecurityTab.tsx` — Fix MFA endpoints to `/auth/mfa/*` (Section 11.1)
- [ ] `src/components/board/ColumnManagerModal.tsx` — Create column management modal (Section 3)
- [ ] `src/hooks/useBoards.ts` — Add `useCreateColumn`, `useUpdateColumn`, `useDeleteColumn`, `useReorderColumns` (Section 3)
- [ ] `src/components/board/ItemDetailModal.tsx` — Add activity feed tab (Section 4.1)
- [ ] `src/hooks/useItems.ts` — Add `useItemActivity` hook (Section 4.1)
- [ ] `src/components/board/ItemDetailModal.tsx` — Fully implement SubItems component (Section 4.2)
- [ ] `src/hooks/useItems.ts` — Add `useSubItems` hook (Section 4.2)
- [ ] `src/components/board/ItemDetailModal.tsx` — Implement assignee add/remove (Section 4.3)
- [ ] `src/hooks/useItems.ts` — Add `useAddAssignee`, `useRemoveAssignee` (Section 4.3)
- [ ] `src/pages/crm/CompaniesPage.tsx` — Create companies page (Section 5)
- [ ] `src/components/crm/CompanyDrawer.tsx` — Create company detail drawer (Section 5)
- [ ] `src/hooks/useCompanies.ts` — Create all company hooks (Section 5)
- [ ] `src/components/crm/PipelineManagerModal.tsx` — Create pipeline/stage management (Section 6)
- [ ] `src/hooks/usePipelines.ts` — Create all pipeline/stage hooks (Section 6)
- [ ] `src/components/crm/DealDetailModal.tsx` — Wire deal move-between-pipelines (Section 7)
- [ ] `src/components/ai/AIChatPanel.tsx` — Create AI chat panel (Section 8.1)
- [ ] `src/stores/aiStore.ts` — Create AI panel Zustand store (Section 8.1)
- [ ] `src/hooks/useAI.ts` — Create `useAIChat`, `useAICredits`, `useAIGenerate` (Section 8)
- [ ] `src/components/layout/TopBar.tsx` — Add AI panel toggle button + credits display (Section 8.2)
- [ ] `src/layouts/AppLayout.tsx` — Render `AIChatPanel` (Section 8.1)
- [ ] `src/components/settings/BillingTab.tsx` — Add PayFast checkout button (Section 9)
- [ ] `src/hooks/useNotifications.ts` — Add WebSocket subscription (Section 10.1)
- [ ] `src/hooks/useNotifications.ts` — Add `refetchInterval` polling fallback (Section 10.2)

### Phase 3 — Medium

- [ ] `src/components/board/ItemDetailModal.tsx` — Add duplicate button (Section 4.4)
- [ ] `src/hooks/useItems.ts` — Add `useDuplicateItem` (Section 4.4)
- [ ] `src/components/board/MoveItemModal.tsx` — Create move-to-board modal (Section 4.5)
- [ ] `src/components/board/ItemDetailModal.tsx` — Add "Move to board" menu option (Section 4.5)
- [ ] `src/components/board/ItemDetailModal.tsx` — Add AI generate description button (Section 8.3)
- [ ] `src/pages/documents/DocumentPage.tsx` — Add AI generate document button (Section 8.4)
- [ ] `src/components/crm/DealDetailModal.tsx` — Add AI deal summary (Section 8.6)
- [ ] `src/components/settings/SecurityTab.tsx` — Fix password change endpoint (Section 11.2)
- [ ] `src/components/settings/GeneralTab.tsx` — Add workspace logo upload/remove UI (Section 11.5)
- [ ] `src/components/settings/MembersTab.tsx` — Fix invitation revoke endpoint (Section 2.2)

### Phase 4 — Low

- [ ] `src/pages/automation/AutomationPage.tsx` — Add AI automation generator (Section 8.5)
- [ ] `src/components/automation/RuleBuilderModal.tsx` — AI rule builder mode (Section 8.5)
- [ ] `src/components/settings/NotificationsTab.tsx` — Wire notification preferences (Section 11.3)
- [ ] `src/components/settings/SecurityTab.tsx` — Wire session management (Section 11.4)

---

## 13. npm Packages Needed

### Required (add to `package.json`)

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

**Why:** Column reordering (Section 3), stage reordering (Section 6). The project already uses a DnD approach in KanbanView — standardize on `@dnd-kit` throughout. Avoid `react-beautiful-dnd` (not maintained).

### Already Available (confirm in `package.json`)

- `date-fns` — used in `ItemDetailModal.tsx` (`format`). Add `formatDistanceToNow` usage for activity feed.
- `lucide-react` — icon library already in use. All icons referenced in this plan are available in lucide.
- `react-hot-toast` — already used for all toast notifications.
- `zustand` — already used for `authStore` and `notificationStore`.
- `@tanstack/react-query` v5 — already installed.
- `react-hook-form` + `@hookform/resolvers` + `zod` — already used in `LoginPage.tsx`.

### Optional / Evaluate

| Package | Use case | Recommendation |
|---------|----------|---------------|
| `@tiptap/react` | Rich text in ItemDetailModal description | Evaluate — currently description is a plain `<textarea>`. Tiptap already appears to be referenced via `normalizeDescription()` in `useItems.ts`. If Tiptap is already installed, use `useEditor` for the description field. |
| `react-virtuoso` or `@tanstack/react-virtual` | Virtualizing long company/contact lists | Add if lists exceed 500 rows. Prefer `@tanstack/react-virtual` since it aligns with the existing Tanstack ecosystem. |
| `dayjs` | Lightweight date formatting alternative | Not needed — `date-fns` is sufficient. |

---

## 14. Performance Considerations

### Virtualization

**Companies page and Contacts page** — if the workspace has thousands of contacts/companies, rendering all rows causes layout jank. Implement windowing:

```tsx
// Using @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual'

const parentRef = useRef<HTMLDivElement>(null)
const rowVirtualizer = useVirtualizer({
  count: companies.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // row height in px
  overscan: 10,
})

return (
  <div ref={parentRef} className="overflow-auto h-full">
    <div style={{ height: rowVirtualizer.getTotalSize() + 'px', position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map(vRow => (
        <div
          key={vRow.index}
          style={{ position: 'absolute', top: vRow.start + 'px', width: '100%', height: vRow.size + 'px' }}
        >
          <CompanyRow company={companies[vRow.index]} />
        </div>
      ))}
    </div>
  </div>
)
```

Apply the same pattern to:
- `ContactsPage` (already likely needs it)
- Activity feed in `ItemDetailModal` (if items have 100+ events)
- Notification list in `NotificationPanel`

### Optimistic Updates

All mutation hooks that affect list data should include optimistic updates using `onMutate` / `onError` / `onSettled`. Priority targets:

| Mutation | Optimistic strategy |
|----------|-------------------|
| `useReorderColumns` | Reorder `board.columns` array in cache before API responds (Section 3) |
| `useReorderStages` | Reorder `pipeline.stages` array in cache (Section 6) |
| `useUpdateNotificationPreferences` | Merge new prefs into cached prefs object (Section 11.3) |
| `useMoveItem` | Already implemented in `useItems.ts` — use same pattern for `useMoveItemToBoard` |
| `useMoveDeal` | Update deal's `pipeline_id` / `stage_id` in cache immediately (Section 7) |
| Adding/removing assignees | Update `item.assignees` array in cache before API responds (Section 4.3) |

Template for optimistic updates:
```typescript
onMutate: async (newData) => {
  const key = ['query-key', id]
  await qc.cancelQueries({ queryKey: key })
  const prev = qc.getQueryData(key)
  qc.setQueryData(key, (old) => /* apply local change to old */)
  return { prev }
},
onError: (_err, _vars, ctx) => {
  qc.setQueryData(key, ctx?.prev)
},
onSettled: () => qc.invalidateQueries({ queryKey: key }),
```

### Query Stale Times

Set appropriate `staleTime` to reduce redundant fetches:

```typescript
// Rarely-changing data — cache aggressively
usePipelines:        staleTime: 5 * 60 * 1000   // 5 min
useWorkspaceMembers: staleTime: 2 * 60 * 1000   // 2 min
useBoards:           staleTime: 60 * 1000        // 1 min
useAICredits:        staleTime: 30 * 1000        // 30s — changes after AI usage

// Frequently-changing data — use refetchInterval instead of short staleTime
useNotifications:    refetchInterval: 30_000, staleTime: 20_000
```

### Code Splitting

New pages (CompaniesPage, AIChatPanel, PipelineManagerModal, ColumnManagerModal) should be lazy-loaded:

```tsx
// In App.tsx — wrap new page imports with React.lazy
const CompaniesPage      = lazy(() => import('@/pages/crm/CompaniesPage'))
const AIChatPanel        = lazy(() => import('@/components/ai/AIChatPanel'))

// Wrap route elements in <Suspense>
<Route path="/crm/companies" element={
  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>}>
    <CompaniesPage />
  </Suspense>
} />
```

### WebSocket Connection Management

The socket from `src/lib/socket.ts` should be a singleton. Ensure:
1. `getSocket()` returns the same instance across all hook calls
2. All `room:join` calls are matched by `room:leave` on unmount (already done in `useItems.ts` — follow the same pattern for notifications)
3. Reconnection logic handles token expiry — emit the new token to the socket server after a successful refresh

### Image Upload UX

For workspace logo upload (Section 11.5) and item file attachments:
- Show upload progress via `axios` `onUploadProgress` callback + a `<progress>` element
- Validate file size on the client before upload (`file.size > 2 * 1024 * 1024` → toast error)
- Show a thumbnail preview immediately after file selection (before upload completes) using `URL.createObjectURL(file)`

### Debounced API Calls

For inline-edit fields that save on blur (title, description, stage names):
- Use `useDebounce` (already exists at `src/hooks/useDebounce.ts`) for any field that saves on `onChange` rather than `onBlur`
- Minimum debounce: 500ms for description, 300ms for title

```typescript
const debouncedTitle = useDebounce(title, 300)
useEffect(() => {
  if (debouncedTitle !== item.title) {
    updateItem.mutate({ title: debouncedTitle })
  }
}, [debouncedTitle])
```
