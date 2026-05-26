import { X, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAutomationRuns } from '@/hooks/useAutomation'
import { formatDate } from '@/lib/erp'

interface Props {
  automationId: string
  automationName: string
  onClose: () => void
}

export default function RunHistory({ automationId, automationName, onClose }: Props) {
  const { data: runs = [], isLoading } = useAutomationRuns(automationId)

  function StatusIcon({ status }: { status: string }) {
    switch (status) {
      case 'completed': return <CheckCircle size={14} className="text-emerald-400" />
      case 'failed':    return <XCircle size={14} className="text-red-400" />
      case 'running':   return <Loader2 size={14} className="text-blue-400 animate-spin" />
      default:          return <Clock size={14} className="text-gray-500" />
    }
  }

  function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
      completed: 'bg-emerald-400/10 text-emerald-400',
      failed:    'bg-red-400/10 text-red-400',
      running:   'bg-blue-400/10 text-blue-400',
      pending:   'bg-gray-700 text-gray-400',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors[status] ?? 'bg-gray-700 text-gray-400'}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-gray-900 border-l border-gray-800 flex flex-col z-40 shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div>
          <p className="font-semibold text-gray-100 text-sm">Run History</p>
          <p className="text-xs text-gray-500">{automationName}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-1">
            <Clock size={20} className="text-gray-600" />
            <p className="text-gray-500 text-sm">No runs yet</p>
            <p className="text-gray-600 text-xs">Runs appear when this rule triggers</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {runs.map((run) => (
              <div key={run.id} className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={run.status} />
                    <StatusBadge status={run.status} />
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(run.created_at)}</span>
                </div>
                {run.started_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Started: {formatDate(run.started_at)}
                    {run.completed_at && ` · Completed: ${formatDate(run.completed_at)}`}
                  </p>
                )}
                {run.error_message && (
                  <p className="text-xs text-red-400 mt-1 bg-red-400/5 rounded px-2 py-1">{run.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
