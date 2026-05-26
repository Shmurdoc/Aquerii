import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSalesOrders, useCreateSalesOrder } from '@/hooks/useSalesOrders'
import { erpSalesOrders, SalesOrder } from '@/lib/erp'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const mockOrders: SalesOrder[] = [
  {
    id: 'so1', workspace_id: 'w1', order_number: 'SO-001', customer_name: 'Acme', customer_id: null,
    customer_email: null, status: 'draft', currency: 'USD', subtotal: 100, tax_total: 10, total: 110,
    order_date: '2024-01-01', expected_date: null, shipping_address: null, notes: null,
    created_by: 'u1', created_at: '', updated_at: '', items: [],
  },
]

beforeEach(() => {
  queryClient.clear()
  vi.restoreAllMocks()
})

describe('useSalesOrders', () => {
  it('fetches sales orders list', async () => {
    vi.spyOn(erpSalesOrders, 'list').mockResolvedValue(mockOrders)

    const { result } = renderHook(() => useSalesOrders(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockOrders)
      expect(erpSalesOrders.list).toHaveBeenCalledWith(undefined)
    })
  })

  it('passes params to list', async () => {
    vi.spyOn(erpSalesOrders, 'list').mockResolvedValue(mockOrders)
    const params = { status: 'draft' }

    renderHook(() => useSalesOrders(params), { wrapper })

    await waitFor(() => {
      expect(erpSalesOrders.list).toHaveBeenCalledWith(params)
    })
  })
})

describe('useCreateSalesOrder', () => {
  it('calls create mutation', async () => {
    vi.spyOn(erpSalesOrders, 'create').mockResolvedValue(mockOrders[0])

    const { result } = renderHook(() => useCreateSalesOrder(), { wrapper })

    result.current.mutate({ customer_name: 'Acme' } as any)

    await waitFor(() => {
      expect(erpSalesOrders.create).toHaveBeenCalledWith({ customer_name: 'Acme' })
    })
  })
})
