import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  avatar_url: string | null
  mfa_enabled: boolean
}

interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  logo_url?: string | null
  color?: string | null
}

interface AuthState {
  token: string | null
  user: User | null
  workspace: Workspace | null
  role: string | null
  setAuth: (token: string, user: User, workspace: Workspace, role?: string) => void
  setUser: (user: User) => void
  setWorkspace: (workspace: Workspace) => void
  setRole: (role: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:     null,
      user:      null,
      workspace: null,
      role:      null,

      setAuth: (token, user, workspace, role) => set({ token, user, workspace, role: role ?? null }),
      setUser: (user) => set({ user }),
      setWorkspace: (workspace) => set({ workspace }),
      setRole: (role) => set({ role }),
      logout: () => set({ token: null, user: null, workspace: null, role: null }),
    }),
    {
      name: 'aquerii-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        token:     state.token,
        user:      state.user,
        workspace: state.workspace,
        role:      state.role,
      }),
    }
  )
)
