import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Plus, DollarSign } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function CRMPage() {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()

  const { data: pipelines = [] } = useQuery({
    queryKey: ['crm-pipelines', workspace?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/crm/pipelines`)
      return res.data.data
    },
    enabled: !!workspace,
  })

  const pipeline = pipelines[0]

  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals', workspace?.id, pipeline?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspace!.id}/crm/deals`, {
        params: { pipeline_id: pipeline.id },
      })
      return res.data.data
    },
    enabled: !!workspace && !!pipeline,
  })

  const createDeal = useMutation({
    mutationFn: (stageId: string) =>
      api.post(`/workspaces/${workspace!.id}/crm/deals`, {
        pipeline_id: pipeline.id,
        stage_id:    stageId,
        title:       'New Deal',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-deals', workspace?.id, pipeline?.id] }),
    onError:   () => toast.error('Failed to create deal.'),
  })

  if (!pipeline) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No CRM pipeline found.
      </div>
    )
  }

  const stages = [...(pipeline.stages ?? [])].sort((a: any, b: any) => a.position - b.position)

  const dealsByStage = (stageId: string) =>
    deals.filter((d: any) => d.stage_id === stageId)

  const stageValue = (stageId: string) =>
    dealsByStage(stageId).reduce((sum: number, d: any) => sum + (d.value ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-white flex-1">{pipeline.name}</h1>
      </div>

      <div className="flex gap-4 px-6 py-4 overflow-x-auto flex-1">
        {stages.map((stage: any) => (
          <div key={stage.id} className="flex flex-col min-w-[240px]">
            {/* Stage header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color ?? '#6366f1' }}
                />
                <span className="text-xs font-medium text-gray-300">{stage.name}</span>
              </div>
              <span className="text-xs text-gray-500">
                ${stageValue(stage.id).toLocaleString()}
              </span>
            </div>

            {/* Deal cards */}
            <div className="flex-1 space-y-2 min-h-[80px] bg-gray-900/40 rounded-xl p-2">
              {dealsByStage(stage.id).map((deal: any) => (
                <div
                  key={deal.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-indigo-500/40 transition-colors"
                >
                  <p className="text-sm text-gray-100 font-medium truncate">{deal.title}</p>
                  {deal.value && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                      <DollarSign size={10} />
                      {deal.value.toLocaleString()} {deal.currency}
                    </div>
                  )}
                  {deal.ai_score !== null && deal.ai_score !== undefined && (
                    <div className={clsx(
                      'mt-1.5 text-xs font-medium px-1.5 py-0.5 rounded inline-block',
                      deal.ai_score >= 70 ? 'bg-green-500/20 text-green-400' :
                      deal.ai_score >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                    )}>
                      AI: {deal.ai_score}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add deal */}
            <button
              onClick={() => createDeal.mutate(stage.id)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors mt-1"
            >
              <Plus size={12} />
              Add deal
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
