import { useAuthStore } from '../authStore'

beforeEach(() => {
  useAuthStore.setState({
    token: null,
    user: null,
    workspace: null,
    role: null,
  })
})

describe('authStore', () => {
  it('has correct initial state', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.workspace).toBeNull()
    expect(state.role).toBeNull()
  })

  it('setAuth sets token, user, workspace, and role', () => {
    const user = { id: 'u1', name: 'Test', email: 'test@test.com', avatar_url: null, mfa_enabled: false }
    const workspace = { id: 'w1', name: 'Workspace', slug: 'ws', plan: 'pro' }

    useAuthStore.getState().setAuth('token-123', user, workspace, 'admin')

    const state = useAuthStore.getState()
    expect(state.token).toBe('token-123')
    expect(state.user).toEqual(user)
    expect(state.workspace).toEqual(workspace)
    expect(state.role).toBe('admin')
  })

  it('setAuth defaults role to null when not provided', () => {
    const user = { id: 'u1', name: 'Test', email: 'test@test.com', avatar_url: null, mfa_enabled: false }
    const workspace = { id: 'w1', name: 'Workspace', slug: 'ws', plan: 'pro' }

    useAuthStore.getState().setAuth('token-123', user, workspace)

    expect(useAuthStore.getState().role).toBeNull()
  })

  it('setUser updates only the user', () => {
    useAuthStore.getState().setAuth('old-token', null as any, null as any, 'member')
    const newUser = { id: 'u2', name: 'New User', email: 'new@test.com', avatar_url: null, mfa_enabled: false }

    useAuthStore.getState().setUser(newUser)

    expect(useAuthStore.getState().user).toEqual(newUser)
    expect(useAuthStore.getState().token).toBe('old-token')
  })

  it('setWorkspace updates only the workspace', () => {
    const ws = { id: 'w1', name: 'New Workspace', slug: 'new', plan: 'free' }
    useAuthStore.getState().setWorkspace(ws)
    expect(useAuthStore.getState().workspace).toEqual(ws)
  })

  it('setRole updates only the role', () => {
    useAuthStore.getState().setRole('viewer')
    expect(useAuthStore.getState().role).toBe('viewer')
  })

  it('logout clears all state', () => {
    const user = { id: 'u1', name: 'Test', email: 'test@test.com', avatar_url: null, mfa_enabled: false }
    const workspace = { id: 'w1', name: 'Workspace', slug: 'ws', plan: 'pro' }

    useAuthStore.getState().setAuth('token-123', user, workspace, 'admin')
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.workspace).toBeNull()
    expect(state.role).toBeNull()
  })

  it('persists to sessionStorage', () => {
    const user = { id: 'u1', name: 'Test', email: 'test@test.com', avatar_url: null, mfa_enabled: false }
    const workspace = { id: 'w1', name: 'Workspace', slug: 'ws', plan: 'pro' }

    useAuthStore.getState().setAuth('persist-token', user, workspace, 'admin')

    const stored = sessionStorage.getItem('aquerii-auth')
    expect(stored).not.toBeNull()

    const parsed = JSON.parse(stored!)
    expect(parsed.state.token).toBe('persist-token')
    expect(parsed.state.user).toEqual(user)
    expect(parsed.state.workspace).toEqual(workspace)
    expect(parsed.state.role).toBe('admin')
  })
})
