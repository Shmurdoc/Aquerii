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
}

interface AuthState {
  token: string | null
  user: User | null
  workspace: Workspace | null
  setAuth: (token: string, user: User, workspace: Workspace) => void
  setWorkspace: (workspace: Workspace) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:     null,
      user:      null,
      workspace: null,

      setAuth: (token, user, workspace) => set({ token, user, workspace }),
      setWorkspace: (workspace) => set({ workspace }),
      logout: () => set({ token: null, user: null, workspace: null }),
    }),
    {
      name: 'aquerii-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        token:     state.token,
        user:      state.user,
        workspace: state.workspace,
      }),
    }
  )
)
