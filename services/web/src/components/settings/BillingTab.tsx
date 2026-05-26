import { useAuthStore } from '@/stores/authStore'
import { useBilling, useCreateCheckout, useCreatePortal, useCancelSubscription } from '@/hooks/useSettings'
import { PLANS } from '@/lib/settings'
import { Check, CreditCard, ExternalLink, XCircle } from 'lucide-react'

const STRIPE_PRICE_IDS: Record<string, string> = {
  starter:  'price_starter_monthly',
  growth:   'price_growth_monthly',
  business: 'price_business_monthly',
}

export default function BillingTab() {
  const workspace = useAuthStore((s) => s.workspace)!
  const baseUrl   = window.location.origin

  const { data: billing, isLoading } = useBilling()
  const checkout   = useCreateCheckout()
  const portal     = useCreatePortal()
  const cancelSub  = useCancelSubscription()

  const currentPlan = billing?.plan ?? workspace.plan ?? 'free'

  async function handleUpgrade(planId: string) {
    const priceId = STRIPE_PRICE_IDS[planId]
    if (!priceId) return
    const result = await checkout.mutateAsync({
      price_id: priceId,
      success_url: `${baseUrl}/settings/billing`,
      cancel_url: `${baseUrl}/settings/billing`,
    })
    if (result.url) window.location.href = result.url
  }

  async function handlePortal() {
    const result = await portal.mutateAsync(`${baseUrl}/settings/billing`)
    if (result.url) window.location.href = result.url
  }

  async function handleCancel() {
    if (!confirm('Cancel subscription? You will retain access until the current period ends.')) return
    await cancelSub.mutateAsync()
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-base font-semibold text-gray-100 mb-1">Billing</h2>
      <p className="text-xs text-gray-500 mb-6">Manage your plan and payment methods.</p>

      {/* Current plan status */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-200">
            Current plan: <span className="font-semibold capitalize">{currentPlan}</span>
          </p>
          {billing && billing.status !== 'none' && (
            <p className="text-xs text-gray-500 mt-0.5">
              Status: {billing.status}
              {billing.cancel_at_period_end && ' (cancels at period end)'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {billing && billing.status !== 'none' && (
            <>
              <button onClick={handlePortal}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">
                <CreditCard size={13} />Manage
              </button>
              {!billing.cancel_at_period_end && (
                <button onClick={handleCancel}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-red-900/40 text-gray-400 hover:text-red-400">
                  <XCircle size={13} />Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANS.map((plan) => {
          const isCurrent  = plan.id === currentPlan
          const isUpgrade  = !isCurrent && plan.id !== 'free'
          const isDowngrade = !isCurrent && PLANS.findIndex((p) => p.id === plan.id) < PLANS.findIndex((p) => p.id === currentPlan)

          return (
            <div key={plan.id} className={`border rounded-lg p-4 flex flex-col gap-2 ${isCurrent ? 'border-indigo-500 bg-indigo-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{plan.label}</p>
              <p className="text-2xl font-bold text-gray-100">{plan.price}<span className="text-xs text-gray-500 font-normal">/mo</span></p>

              <ul className="flex flex-col gap-1.5 mt-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                    <Check size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex-1" />

              {isCurrent ? (
                <span className="text-xs text-center py-1.5 rounded bg-indigo-600/20 text-indigo-400 font-medium">Current</span>
              ) : isUpgrade ? (
                <button onClick={() => handleUpgrade(plan.id)} disabled={checkout.isPending}
                  className="text-xs text-center py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                  {checkout.isPending ? 'Redirecting…' : 'Upgrade'}
                </button>
              ) : isDowngrade ? (
                <button onClick={() => handleUpgrade(plan.id)} disabled={checkout.isPending}
                  className="text-xs text-center py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-50">
                  Downgrade
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {isLoading && <p className="text-gray-500 text-xs mt-4">Loading billing info…</p>}
    </div>
  )
}
