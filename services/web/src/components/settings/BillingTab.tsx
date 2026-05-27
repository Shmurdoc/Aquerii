import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useBilling, useCreateCheckout, useCreatePortal, useCancelSubscription } from '@/hooks/useSettings'
import { PLANS, type PlanId } from '@/lib/settings'
import UsageMeter from '@/components/subscription/UsageMeter'
import { Check, CreditCard, XCircle, Zap, Shield, TrendingUp, Sparkles, ExternalLink, ArrowRight, HelpCircle, ChevronRight } from 'lucide-react'

const STRIPE_PRICE_IDS: Record<string, string> = {
  starter:  'price_starter_monthly',
  growth:   'price_growth_monthly',
  business: 'price_business_monthly',
}

function PlanCard({ plan, isCurrent, currentPlan, onUpgrade, onContactSales, isLoading }: {
  plan: typeof PLANS[number]
  isCurrent: boolean
  currentPlan: string
  onUpgrade: (id: PlanId) => void
  onContactSales: () => void
  isLoading: boolean
}) {
  const planIndex = PLANS.findIndex((p) => p.id === plan.id)
  const currentIndex = PLANS.findIndex((p) => p.id === currentPlan)
  const isDowngrade = !isCurrent && planIndex < currentIndex
  const isEnterprise = plan.id === 'enterprise'

  return (
    <div
      className={`relative flex flex-col rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
        isCurrent
          ? 'border-accent/50 bg-accent/[0.03] shadow-[0_0_30px_-5px] shadow-accent/20'
          : plan.popular
          ? 'border-gray-600 bg-gray-800/40'
          : 'border-gray-700/50 bg-gray-800/20 hover:border-gray-600'
      }`}
    >
      {plan.popular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-accent text-white shadow-lg">
            <Zap size={10} /> Most Popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg">
            <Sparkles size={10} /> Current Plan
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{plan.label}</p>
          <div className="mt-2 flex items-baseline gap-0.5">
            <span className="text-3xl font-bold text-gray-100">{plan.price}</span>
            {plan.price !== 'Custom' && <span className="text-xs text-gray-500">/mo</span>}
          </div>
          {plan.annualPrice && plan.price !== 'Custom' && (
            <p className="text-[10px] text-gray-600 mt-0.5">
              {plan.annualPrice}/mo billed annually
            </p>
          )}
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{plan.description}</p>
        </div>

        {plan.highlight && (
          <div className="text-[11px] text-gray-400 bg-gray-800/60 rounded-lg p-3 border border-gray-700/50 leading-relaxed">
            {plan.highlight}
          </div>
        )}

        <ul className="flex flex-col gap-2 flex-1">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <Check size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <span className="text-xs text-center py-2 rounded-lg bg-accent/10 text-accent font-medium border border-accent/20">
            Current Plan
          </span>
        ) : isEnterprise ? (
          <button onClick={onContactSales}
            className="text-xs text-center py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center justify-center gap-1.5">
            <HelpCircle size={12} /> Contact Sales
          </button>
        ) : isDowngrade ? (
          <button onClick={() => onUpgrade(plan.id)} disabled={isLoading}
            className="text-xs text-center py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50">
            {isLoading ? 'Processing...' : 'Downgrade'}
          </button>
        ) : (
          <button onClick={() => onUpgrade(plan.id)} disabled={isLoading}
            className="text-xs text-center py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-all disabled:opacity-50 shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5">
            {isLoading ? 'Redirecting...' : <>Upgrade <ArrowRight size={12} /></>}
          </button>
        )}
      </div>
    </div>
  )
}

export default function BillingTab() {
  const workspace = useAuthStore((s) => s.workspace)!
  const baseUrl = window.location.origin
  const [billingYearly, setBillingYearly] = useState(false)

  const { data: billing, isLoading } = useBilling()
  const checkout = useCreateCheckout()
  const portal = useCreatePortal()
  const cancelSub = useCancelSubscription()

  const currentPlan = (billing?.plan ?? workspace.plan ?? 'free') as PlanId

  async function handleUpgrade(planId: PlanId) {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@aquerii.com?subject=Enterprise Inquiry'
      return
    }
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

  const limits = billing?.plan_limits ?? billing?.limits
  const displayPlans = billingYearly ? PLANS.map(p => ({ ...p, price: p.annualPrice })) : PLANS

  return (
    <div className="max-w-5xl">
      {/* ── Header ── */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-100">Subscription</h2>
        <p className="text-xs text-gray-500 mt-1">Manage your plan, monitor usage, and view billing history.</p>
      </div>

      {/* ── Current Plan Hero ── */}
      <div className="relative overflow-hidden rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 via-gray-800/30 to-gray-900/60 p-6 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Zap size={22} className="text-accent" />
            </div>
            <div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-gray-100 capitalize">{billing?.label ?? currentPlan}</span> Plan
              </p>
              <div className="flex items-center gap-2 mt-1">
                {billing ? (
                  <>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      billing.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      billing.status === 'trialing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      billing.status === 'past_due' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        billing.status === 'active' ? 'bg-emerald-400' :
                        billing.status === 'trialing' ? 'bg-blue-400' :
                        billing.status === 'past_due' ? 'bg-amber-400' :
                        'bg-gray-400'
                      }`} />
                      {billing.status === 'active' ? 'Active' :
                       billing.status === 'trialing' ? 'Trial' :
                       billing.status === 'past_due' ? 'Past Due' :
                       billing.status === 'none' ? 'No Subscription' : billing.status}
                    </span>
                    {billing.cancel_at_period_end && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Cancels at period end
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-gray-600">Loading...</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {billing && billing.status !== 'none' && billing.status !== 'free' && (
              <>
                <button onClick={handlePortal}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                  <CreditCard size={13} /> Billing Portal
                </button>
                {!billing.cancel_at_period_end && (
                  <button onClick={handleCancel} disabled={cancelSub.isPending}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50">
                    <XCircle size={13} /> {cancelSub.isPending ? '...' : 'Cancel'}
                  </button>
                )}
              </>
            )}
            {(!billing || billing.status === 'none' || billing.status === 'free') && (
              <a href="#plans"
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white transition-colors">
                View Plans <ChevronRight size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Usage meters */}
        {billing && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700/30">
            <UsageMeter
              label="Storage"
              used={billing.storage_used_bytes}
              limit={limits?.max_storage_bytes ?? limits?.storage ?? 100 * 1024 * 1024}
              unit="bytes"
            />
            <UsageMeter
              label="Team Seats"
              used={billing.seat_count}
              limit={limits?.max_seats ?? 3}
            />
            <UsageMeter
              label="AI Credits"
              used={billing.ai_credits_used ?? 0}
              limit={limits?.ai_credits ?? 200}
            />
          </div>
        )}
      </div>

      {/* ── Billing Toggle & Plan Grid ── */}
      <div id="plans" className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Compare Plans</h3>
        <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg p-0.5 border border-gray-700/50">
          <button onClick={() => setBillingYearly(false)}
            className={`text-[11px] px-3 py-1.5 rounded-md transition-all ${!billingYearly ? 'bg-accent text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}>
            Monthly
          </button>
          <button onClick={() => setBillingYearly(true)}
            className={`text-[11px] px-3 py-1.5 rounded-md transition-all ${billingYearly ? 'bg-accent text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}>
            Annual
            <span className="ml-1 text-[9px] text-emerald-400 font-medium">Save up to 20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {displayPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlan}
            currentPlan={currentPlan}
            onUpgrade={handleUpgrade}
            onContactSales={() => window.location.href = 'mailto:sales@aquerii.com?subject=Enterprise Inquiry'}
            isLoading={checkout.isPending}
          />
        ))}
      </div>

      {/* ── Enterprise CTA ── */}
      {currentPlan !== 'enterprise' && (
        <div className="mt-8 relative overflow-hidden rounded-xl border border-gray-700/50 bg-gradient-to-r from-gray-800/40 via-gray-800/20 to-gray-800/40 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <TrendingUp size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">Need more power?</p>
                <p className="text-xs text-gray-500 mt-0.5">Enterprise plans with custom pricing, dedicated support, and on-premise options.</p>
              </div>
            </div>
            <a href="mailto:sales@aquerii.com?subject=Enterprise Inquiry"
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors whitespace-nowrap">
              Talk to Sales <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* ── Features comparison callout ── */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Shield, label: 'Secure & Compliant', desc: 'Enterprise-grade security with encryption at rest and in transit.' },
          { icon: TrendingUp, label: 'Scale as You Grow', desc: 'Upgrade or downgrade anytime. No contracts, no penalties.' },
          { icon: Sparkles, label: 'AI-Powered', desc: 'Smart automation, deal scoring, and AI-assisted workflows.' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-3 rounded-lg border border-gray-700/30 bg-gray-800/20 p-4">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-accent" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300">{label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="mt-6 flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-accent rounded-full animate-spin" />
            Loading billing info...
          </div>
        </div>
      )}
    </div>
  )
}
