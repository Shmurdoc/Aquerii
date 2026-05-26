import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { erpInvoices, Invoice, CreateInvoicePayload, UpdateInvoicePayload } from '@/lib/erp'
import toast from 'react-hot-toast'

export function useInvoices(params?: { status?: string; search?: string }) {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', params],
    queryFn: () => erpInvoices.list(params),
    staleTime: 30_000,
  })
}

export function useInvoice(id: string) {
  return useQuery<Invoice>({
    queryKey: ['invoices', id],
    queryFn: () => erpInvoices.get(id),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation<Invoice, Error, CreateInvoicePayload>({
    mutationFn: (payload) => erpInvoices.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation<Invoice, Error, { id: string; payload: UpdateInvoicePayload }>({
    mutationFn: ({ id, payload }) => erpInvoices.update(id, payload),
    onSuccess: (invoice) => {
      qc.setQueryData(['invoices', invoice.id], invoice)
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpInvoices.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}
