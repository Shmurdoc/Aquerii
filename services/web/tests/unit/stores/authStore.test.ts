import { useAuthStore } from '@/stores/authStore'
import { act } from '@testing-library/react'

const mockUser = { id: 'u1', name: 'Test User', email: 'test@example.com', avatar_url: null, mfa_enabled: false }
const mockWorkspace = { id: 'w1', name: 'Test Workspace', slug: 'test-workspace', plan: 'free' }

beforeEach(() => {
  sessionStorage.clear()
  useAuthStore.setState({ token: null, user: null, workspace: null })
})

describe('authStore', () => {
  it('setAuth sets token, user, and workspace', () => {
    act(() => {
      useAuthStore.getState().setAuth('tok-123', mockUser, mockWorkspace)
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('tok-123')
    expect(state.user).toEqual(mockUser)
    expect(state.workspace).toEqual(mockWorkspace)
  })

  it('logout clears all state', () => {
    act(() => {
      useAuthStore.getState().setAuth('tok-123', mockUser, mockWorkspace)
    })

    act(() => {
      useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.workspace).toBeNull()
  })

  it('setWorkspace updates workspace independently', () => {
    const newWorkspace = { id: 'w2', name: 'Another Workspace', slug: 'another', plan: 'pro' }

    act(() => {
      useAuthStore.getState().setAuth('tok-123', mockUser, mockWorkspace)
    })

    act(() => {
      useAuthStore.getState().setWorkspace(newWorkspace)
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('tok-123')
    expect(state.user).toEqual(mockUser)
    expect(state.workspace).toEqual(newWorkspace)
  })

  it('persists token, user and workspace to sessionStorage', () => {
    act(() => {
      useAuthStore.getState().setAuth('tok-123', mockUser, mockWorkspace)
    })

    const raw = sessionStorage.getItem('aquerii-auth')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.token).toBe('tok-123')
    expect(parsed.state.user).toEqual(mockUser)
    expect(parsed.state.workspace).toEqual(mockWorkspace)
  })

  it('partializes only token, user, workspace (no extra fields)', () => {
    act(() => {
      useAuthStore.getState().setAuth('tok-123', mockUser, mockWorkspace)
    })

    const raw = sessionStorage.getItem('aquerii-auth')
    const parsed = JSON.parse(raw!)
    expect(Object.keys(parsed.state)).toEqual(['token', 'user', 'workspace', 'role'])
  })

  it('persisted data round-trips through sessionStorage', () => {
    act(() => {
      useAuthStore.getState().setAuth('persisted-tok', mockUser, mockWorkspace)
    })

    const raw = sessionStorage.getItem('aquerii-auth')
    const parsed = JSON.parse(raw!)
    expect(parsed.state.token).toBe('persisted-tok')

    act(() => {
      useAuthStore.getState().logout()
    })

    expect(useAuthStore.getState().token).toBeNull()
  })

  it('handles logout with no prior auth state (idempotent)', () => {
    act(() => {
      useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.workspace).toBeNull()
  })
})
