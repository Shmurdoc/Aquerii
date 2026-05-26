import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { erpAccounts, erpJournalEntries, Account, AccountType, JournalEntry } from '@/lib/erp'
import toast from 'react-hot-toast'

// ─── Accounts ─────────────────────────────────────────────────────────────────

export function useAccounts(params?: { type?: AccountType }) {
  return useQuery<Account[]>({
    queryKey: ['accounts', params],
    queryFn: () => erpAccounts.list(params),
    staleTime: 60_000,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation<Account, Error, Parameters<typeof erpAccounts.create>[0]>({
    mutationFn: (payload) => erpAccounts.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account created')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation<Account, Error, { id: string; payload: Parameters<typeof erpAccounts.update>[1] }>({
    mutationFn: ({ id, payload }) => erpAccounts.update(id, payload),
    onSuccess: (account) => {
      qc.setQueryData(['accounts', account.id], account)
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => erpAccounts.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export function useJournalEntries(params?: { from?: string; to?: string; account_id?: string }) {
  return useQuery<JournalEntry[]>({
    queryKey: ['journal-entries', params],
    queryFn: () => erpJournalEntries.list(params),
    staleTime: 30_000,
  })
}

export function useCreateJournalEntry() {
  const qc = useQueryClient()
  return useMutation<JournalEntry[], Error, Parameters<typeof erpJournalEntries.create>[0]>({
    mutationFn: (payload) => erpJournalEntries.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
      toast.success('Journal entry posted')
    },
    onError: (e) => {
      // backend may return 422 with { error: { code, message } }
      const msg = (e as any)?.response?.data?.error?.message ?? e.message
      toast.error(msg)
    },
  })
}
