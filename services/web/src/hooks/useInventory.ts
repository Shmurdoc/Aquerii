import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  erpInventoryCategories, erpProducts, erpStockItems,
  InventoryCategory, Product, StockItem, StockStatus,
} from '@/lib/erp'
import toast from 'react-hot-toast'

// ─── Categories ───────────────────────────────────────────────────────────────

export function useInventoryCategories() {
  return useQuery<InventoryCategory[]>({
    queryKey: ['inventory-categories'],
    queryFn: () => erpInventoryCategories.list(),
    staleTime: 60_000,
  })
}

export function useCreateInventoryCategory() {
  const qc = useQueryClient()
  return useMutation<InventoryCategory, Error, { name: string; parent_id?: string; description?: string; color?: string }>({
    mutationFn: (payload) => erpInventoryCategories.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] })
      toast.success('Category created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateInventoryCategory() {
  const qc = useQueryClient()
  return useMutation<InventoryCategory, Error, { id: string; payload: { name?: string; color?: string; description?: string } }>({
    mutationFn: ({ id, payload }) => erpInventoryCategories.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-categories'] }),
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteInventoryCategory() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpInventoryCategories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] })
      toast.success('Category deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts(params?: { search?: string; category_id?: string }) {
  return useQuery<Product[]>({
    queryKey: ['products', params],
    queryFn: () => erpProducts.list(params),
    staleTime: 30_000,
  })
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['products', id],
    queryFn: () => erpProducts.get(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation<Product, Error, Parameters<typeof erpProducts.create>[0]>({
    mutationFn: (payload) => erpProducts.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation<Product, Error, { id: string; payload: Parameters<typeof erpProducts.update>[1] }>({
    mutationFn: ({ id, payload }) => erpProducts.update(id, payload),
    onSuccess: (p) => {
      qc.setQueryData(['products', p.id], p)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpProducts.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted')
    },
    onError: (e) => {
      // backend returns 409 when product has stock items
      const msg = (e as any)?.response?.data?.message ?? e.message
      toast.error(msg)
    },
  })
}

// ─── Stock Items ──────────────────────────────────────────────────────────────

export function useStockItems(params?: { product_id?: string; status?: StockStatus }) {
  return useQuery<StockItem[]>({
    queryKey: ['stock-items', params],
    queryFn: () => erpStockItems.list(params),
    staleTime: 30_000,
  })
}

export function useCreateStockItem() {
  const qc = useQueryClient()
  return useMutation<StockItem, Error, Parameters<typeof erpStockItems.create>[0]>({
    mutationFn: (payload) => erpStockItems.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-items'] })
      qc.invalidateQueries({ queryKey: ['products'] })  // product totalStock changes
      toast.success('Stock item added')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateStockItem() {
  const qc = useQueryClient()
  return useMutation<StockItem, Error, { id: string; payload: Parameters<typeof erpStockItems.update>[1] }>({
    mutationFn: ({ id, payload }) => erpStockItems.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-items'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteStockItem() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpStockItems.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-items'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Stock item removed')
    },
    onError: (e) => toast.error(e.message),
  })
}
