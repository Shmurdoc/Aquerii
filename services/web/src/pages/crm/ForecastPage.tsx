import { useAuthStore } from '@/stores/authStore'
import { useForecast, useForecastByRep, useForecastByPipeline } from '@/lib/crm'
import { DollarSign, TrendingUp, Target, CheckCircle, Loader2 } from 'lucide-react'

export default function ForecastPage() {
  const workspace = useAuthStore(s => s.workspace)

  const { data: forecast, isLoading } = useForecast(workspace?.id)
  const { data: byRep } = useForecastByRep(workspace?.id)
  const { data: byPipeline } = useForecastByPipeline(workspace?.id)

  if (!workspace || isLoading) return (
    <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
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
      <h1 className="text-lg font-semibold text-white">Forecast</h1>

      <div className="grid grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={14} className={c.color} />
              <span className="text-xs text-gray-500">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.color}`}>${c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">By Rep</h2>
          {(byRep?.data ?? []).length === 0 ? (
            <p className="text-xs text-gray-600">No data</p>
          ) : (
            <div className="space-y-2">
              {(byRep?.data ?? []).map((r: any) => (
                <div key={r.rep_id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-200 flex-1 truncate">{r.rep_name}</span>
                  <div className="text-right">
                    <p className="text-sm text-gray-200">${r.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">weighted: ${r.weighted.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">By Pipeline</h2>
          {(byPipeline?.data ?? []).length === 0 ? (
            <p className="text-xs text-gray-600">No data</p>
          ) : (
            <div className="space-y-2">
              {(byPipeline?.data ?? []).map((p: any) => (
                <div key={p.pipeline_id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-200 flex-1 truncate">{p.pipeline_name}</span>
                  <div className="text-right">
                    <p className="text-sm text-gray-200">${p.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">weighted: ${p.weighted.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
