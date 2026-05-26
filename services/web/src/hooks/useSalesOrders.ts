import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { erpSalesOrders, SalesOrder, CreateSOPayload, UpdateSOPayload } from '@/lib/erp'
import toast from 'react-hot-toast'

export function useSalesOrders(params?: { status?: string; search?: string }) {
  return useQuery<SalesOrder[]>({
    queryKey: ['sales-orders', params],
    queryFn: () => erpSalesOrders.list(params),
    staleTime: 30_000,
  })
}

export function useSalesOrder(id: string) {
  return useQuery<SalesOrder>({
    queryKey: ['sales-orders', id],
    queryFn: () => erpSalesOrders.get(id),
    enabled: !!id,
  })
}

export function useCreateSalesOrder() {
  const qc = useQueryClient()
  return useMutation<SalesOrder, Error, CreateSOPayload>({
    mutationFn: (payload) => erpSalesOrders.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      toast.success('Sales order created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient()
  return useMutation<SalesOrder, Error, { id: string; payload: UpdateSOPayload }>({
    mutationFn: ({ id, payload }) => erpSalesOrders.update(id, payload),
    onSuccess: (so) => {
      qc.setQueryData(['sales-orders', so.id], so)
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpSalesOrders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      toast.success('Sales order deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}
