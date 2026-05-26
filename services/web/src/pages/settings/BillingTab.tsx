import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function BillingTab() {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const { data, isLoading } = useQuery({
    queryKey: ['workspace', wid, 'billing'],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${wid}/billing`)
      return res.data.data
    },
    enabled: !!wid,
  })

  const checkout = useMutation({
    mutationFn: async () => (await api.post(`/workspaces/${wid}/billing/checkout`, {
      price_id: 'price_growth',
      success_url: `${window.location.origin}/settings?billing=success`,
      cancel_url: `${window.location.origin}/settings`,
    })).data.data,
    onSuccess: (d) => { window.location.href = d.url },
    onError: () => toast.error('Checkout failed'),
  })

  const portal = useMutation({
    mutationFn: async () => (await api.post(`/workspaces/${wid}/billing/portal`, {
      return_url: `${window.location.origin}/settings`,
    })).data.data,
    onSuccess: (d) => { window.location.href = d.url },
    onError: () => toast.error('Portal failed'),
  })

  const cancel = useMutation({
    mutationFn: async () => api.delete(`/workspaces/${wid}/billing/subscription`),
    onSuccess: () => {
      toast.success('Subscription cancelled')
      qc.invalidateQueries({ queryKey: ['workspace', wid, 'billing'] })
    },
    onError: () => toast.error('Cancel failed'),
  })

  if (isLoading) return <div className="text-gray-400">Loading billing…</div>

  const plan = data?.plan ?? workspace?.plan ?? 'free'
  const hasSubscription = data?.status && data.status !== 'none'

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Plan</h3>
        <p className="text-2xl font-bold text-white mt-1 capitalize">{plan}</p>
        {data?.status && data.status !== 'none' && (
          <p className="text-sm text-gray-400 mt-1">
            Status: <span className="capitalize">{data.status}</span>
            {data.cancel_at_period_end && ' · Cancels at period end'}
          </p>
        )}
      </section>

      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Manage Subscription</h3>
        <div className="flex gap-3 mt-3">
          {!hasSubscription ? (
            <button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
            >
              {checkout.isPending ? 'Loading…' : 'Upgrade'}
            </button>
          ) : (
            <>
              <button
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
              >
                {portal.isPending ? 'Loading…' : 'Billing Portal'}
              </button>
              <button
                onClick={() => { if (confirm('Cancel subscription?')) cancel.mutate() }}
                disabled={cancel.isPending}
                className="text-red-400 text-sm px-4 py-2 disabled:opacity-50"
              >
                {cancel.isPending ? 'Cancelling…' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      </section>

      {data && (
        <section className="bg-gray-900 p-4 rounded">
          <h3 className="text-lg font-medium text-white">Usage</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-400">
            <div>Seats: {data.seat_count ?? 1}</div>
            {data.storage_used_bytes != null && (
              <div>Storage: {(data.storage_used_bytes / 1_000_000).toFixed(1)} MB</div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
