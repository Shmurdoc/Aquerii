import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCalendarItems } from '@/hooks/useCalendarItems'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { ReactNode } from 'react'

const mockWorkspace = {
  id: 'w1',
  name: 'Test Workspace',
  slug: 'test-workspace',
  plan: 'free',
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  sessionStorage.clear()
  useAuthStore.setState({ token: null, user: null, workspace: null, role: null })
  queryClient.clear()
  vi.restoreAllMocks()
})

describe('useCalendarItems', () => {
  it('does NOT fire network call when workspace is null', () => {
    const getSpy = vi.spyOn(api, 'get')
    useAuthStore.setState({ token: 't', user: { id: 'u1', name: 'U', email: 'e', avatar_url: null, mfa_enabled: false }, workspace: null, role: 'owner' })

    const { result } = renderHook(
      () => useCalendarItems(new Date('2026-06-01'), new Date('2026-06-30')),
      { wrapper },
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(getSpy).not.toHaveBeenCalled()
  })

  it('FIRES network call to /calendar-items when workspace is set', async () => {
    useAuthStore.setState({ token: 't', user: { id: 'u1', name: 'U', email: 'e', avatar_url: null, mfa_enabled: false }, workspace: mockWorkspace, role: 'owner' })

    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: { data: [{ id: 'i1', type: 'task', title: 'Test', due_date: '2026-06-15', workspace_id: 'w1' }] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    } as any)

    const from = new Date(2026, 5, 1)
    const to = new Date(2026, 6, 5)
    const { result } = renderHook(() => useCalendarItems(from, to), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(getSpy).toHaveBeenCalledTimes(1)
    expect(getSpy).toHaveBeenCalledWith(
      '/workspaces/w1/calendar-items',
      expect.objectContaining({
        params: expect.objectContaining({
          from: '2026-06-01',
          to: '2026-07-05',
        }),
      }),
    )
    expect(result.current.data).toEqual([
      { id: 'i1', type: 'task', title: 'Test', due_date: '2026-06-15', workspace_id: 'w1' },
    ])
  })

  it('uses the correct queryKey including from/to and entityType', async () => {
    useAuthStore.setState({ token: 't', user: { id: 'u1', name: 'U', email: 'e', avatar_url: null, mfa_enabled: false }, workspace: mockWorkspace, role: 'owner' })
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] }, status: 200, statusText: 'OK', headers: {}, config: {} as any } as any)

    const from = new Date(2026, 5, 1)
    const to = new Date(2026, 6, 5)
    renderHook(() => useCalendarItems(from, to, 'task'), { wrapper })

    await waitFor(() => {
      const queries = queryClient.getQueryCache().getAll()
      const found = queries.find(q =>
        JSON.stringify(q.queryKey) ===
        JSON.stringify(['calendar-items', 'w1', '2026-06-01', '2026-07-05', 'task']),
      )
      expect(found).toBeDefined()
    })
  })

  it('handles missing data field gracefully (returns empty array)', async () => {
    useAuthStore.setState({ token: 't', user: { id: 'u1', name: 'U', email: 'e', avatar_url: null, mfa_enabled: false }, workspace: mockWorkspace, role: 'owner' })
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { data: null },
      status: 200, statusText: 'OK', headers: {}, config: {} as any,
    } as any)

    const { result } = renderHook(
      () => useCalendarItems(new Date(2026, 5, 1), new Date(2026, 6, 5)),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data).toEqual([])
  })
})
