import { useAuthStore } from '@/stores/authStore'
import { useForecast, useForecastByRep, useForecastByPipeline } from '@/lib/crm'
import { DollarSign, TrendingUp, Target, CheckCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui'

export default function ForecastPage() {
  const workspace = useAuthStore(s => s.workspace)

  const { data: forecast, isLoading } = useForecast(workspace?.id)
  const { data: byRep } = useForecastByRep(workspace?.id)
  const { data: byPipeline } = useForecastByPipeline(workspace?.id)

  if (!workspace || isLoading) return (
    <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
  )

  const f = forecast?.data

  const cards = [
    { label: 'Pipeline Total', value: f?.total_pipeline ?? 0, color: 'text-blue-400', icon: DollarSign },
    { label: 'Weighted Forecast', value: f?.weighted_forecast ?? 0, color: 'text-indigo-400', icon: TrendingUp },
    { label: 'Best Case', value: f?.best_case ?? 0, color: 'text-purple-400', icon: Target },
    { label: 'Commit', value: f?.commit ?? 0, color: 'text-yellow-400', icon: TrendingUp },
    { label: 'Closed Won', value: f?.closed_won ?? 0, color: 'text-green-400', icon: CheckCircle },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Forecast</h1>

      <div className="grid grid-cols-5 gap-4">
        {cards.map(c => (
          <Card key={c.label} padding="md" className="!rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={14} className={c.color} />
              <span className="text-xs text-[var(--color-text-muted)]">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.color}`}>${c.value.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card padding="md" className="!rounded-xl">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">By Rep</h2>
          {(byRep?.data ?? []).length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No data</p>
          ) : (
            <div className="space-y-2">
              {(byRep?.data ?? []).map((r: any) => (
                <div key={r.rep_id} className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-primary)] flex-1 truncate">{r.rep_name}</span>
                  <div className="text-right">
                    <p className="text-sm text-[var(--color-text-primary)]">${r.amount.toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">weighted: ${r.weighted.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md" className="!rounded-xl">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">By Pipeline</h2>
          {(byPipeline?.data ?? []).length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No data</p>
          ) : (
            <div className="space-y-2">
              {(byPipeline?.data ?? []).map((p: any) => (
                <div key={p.pipeline_id} className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-primary)] flex-1 truncate">{p.pipeline_name}</span>
                  <div className="text-right">
                    <p className="text-sm text-[var(--color-text-primary)]">${p.amount.toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">weighted: ${p.weighted.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
