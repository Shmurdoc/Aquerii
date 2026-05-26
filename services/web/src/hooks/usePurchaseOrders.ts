import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { erpPurchaseOrders, PurchaseOrder, CreatePOPayload, UpdatePOPayload } from '@/lib/erp'
import toast from 'react-hot-toast'

export function usePurchaseOrders(params?: { status?: string; search?: string }) {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', params],
    queryFn: () => erpPurchaseOrders.list(params),
    staleTime: 30_000,
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery<PurchaseOrder>({
    queryKey: ['purchase-orders', id],
    queryFn: () => erpPurchaseOrders.get(id),
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation<PurchaseOrder, Error, CreatePOPayload>({
    mutationFn: (payload) => erpPurchaseOrders.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation<PurchaseOrder, Error, { id: string; payload: UpdatePOPayload }>({
    mutationFn: ({ id, payload }) => erpPurchaseOrders.update(id, payload),
    onSuccess: (po) => {
      qc.setQueryData(['purchase-orders', po.id], po)
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpPurchaseOrders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}
