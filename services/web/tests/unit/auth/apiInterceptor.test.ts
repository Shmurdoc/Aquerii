import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

const mockUser = { id: 'u1', name: 'Test User', email: 'test@example.com', avatar_url: null, mfa_enabled: false }
const mockWorkspace = { id: 'w1', name: 'Test Workspace', slug: 'test-workspace', plan: 'free' }

beforeEach(() => {
  sessionStorage.clear()
  useAuthStore.setState({ token: null, user: null, workspace: null })
  vi.restoreAllMocks()
})

describe('api request interceptor', () => {
  it('attaches Bearer token when token exists', async () => {
    useAuthStore.setState({ token: 'my-token', user: mockUser, workspace: mockWorkspace })

    const config: any = { headers: {}, method: 'get', url: '/test' }
    const handlers = (api.interceptors.request as any).handlers
    const result = await handlers[0].fulfilled(config)

    expect(result.headers.Authorization).toBe('Bearer my-token')
  })

  it('attaches X-Workspace-ID when workspace exists', async () => {
    useAuthStore.setState({ token: 'my-token', user: mockUser, workspace: mockWorkspace })

    const config: any = { headers: {}, method: 'get', url: '/test' }
    const handlers = (api.interceptors.request as any).handlers
    const result = await handlers[0].fulfilled(config)

    expect(result.headers['X-Workspace-ID']).toBe('w1')
  })

  it('does not set auth header when token is null', async () => {
    useAuthStore.setState({ token: null, user: null, workspace: null })

    const config: any = { headers: {}, method: 'get', url: '/test' }
    const handlers = (api.interceptors.request as any).handlers
    const result = await handlers[0].fulfilled(config)

    expect(result.headers.Authorization).toBeUndefined()
  })

  it('generates Idempotency-Key for mutating requests', async () => {
    useAuthStore.setState({ token: 'tok', user: mockUser, workspace: mockWorkspace })

    const config: any = { headers: {}, method: 'post', url: '/test' }
    const handlers = (api.interceptors.request as any).handlers
    const result = await handlers[0].fulfilled(config)

    expect(result.headers['Idempotency-Key']).toBeDefined()
    expect(result.headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('does not overwrite existing Idempotency-Key', async () => {
    useAuthStore.setState({ token: 'tok', user: mockUser, workspace: mockWorkspace })

    const config: any = { headers: { 'Idempotency-Key': 'existing-key' }, method: 'post', url: '/test' }
    const handlers = (api.interceptors.request as any).handlers
    const result = await handlers[0].fulfilled(config)

    expect(result.headers['Idempotency-Key']).toBe('existing-key')
  })

  it('does not generate Idempotency-Key for GET requests', async () => {
    useAuthStore.setState({ token: 'tok', user: mockUser, workspace: mockWorkspace })

    const config: any = { headers: {}, method: 'get', url: '/test' }
    const handlers = (api.interceptors.request as any).handlers
    const result = await handlers[0].fulfilled(config)

    expect(result.headers['Idempotency-Key']).toBeUndefined()
  })
})

describe('api response interceptor', () => {
  it('passes through successful responses', async () => {
    const handlers = (api.interceptors.response as any).handlers
    const response = { data: { id: 1 }, status: 200 }
    const result = await handlers[0].fulfilled(response)
    expect(result).toBe(response)
  })

  it('calls logout on 401 non-MFA error', async () => {
    vi.spyOn(useAuthStore.getState(), 'logout')
    const originalLocation = window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: originalLocation },
      writable: true,
    })

    const handlers = (api.interceptors.response as any).handlers
    const error = {
      response: { status: 401, data: { error: { code: 'UNAUTHORIZED' } } },
    }

    try {
      await handlers[0].rejected(error)
    } catch {}

    expect(useAuthStore.getState().logout).toHaveBeenCalled()
    expect(window.location.href).toBe('/login')
  })

  it('does not logout on 401 MFA_REQUIRED', async () => {
    vi.spyOn(useAuthStore.getState(), 'logout')

    const handlers = (api.interceptors.response as any).handlers
    const error = {
      response: { status: 401, data: { error: { code: 'MFA_REQUIRED' } } },
    }

    try {
      await handlers[0].rejected(error)
    } catch {}

    expect(useAuthStore.getState().logout).not.toHaveBeenCalled()
  })

  it('re-throws the error', async () => {
    const handlers = (api.interceptors.response as any).handlers
    const error = new Error('network error')

    await expect(handlers[0].rejected(error)).rejects.toThrow('network error')
  })
})
