import { useState, useMemo } from 'react'
import {
  useActions, useCreateAction, useUpdateAction,
  ACTION_SOURCE_TYPES, ACTION_PRIORITIES, ACTION_STATUSES,
  ACTION_STATUS_COLORS, PRIORITY_COLORS,
  type CorrectiveAction, type ActionSourceType, type ActionPriority, type ActionStatus,
} from '@/lib/hsse'
import { Card, Badge, Button, Input, Textarea, Select } from '@/components/ui'
import { Plus, CheckCircle, X } from 'lucide-react'
import clsx from 'clsx'

export default function CorrectiveActionsPage() {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'open' | 'completed'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<CorrectiveAction | null>(null)

  const apiFilter = useMemo(() => {
    if (filter === 'overdue') return { overdue: true }
    if (filter === 'open') return { status: 'open' as ActionStatus }
    if (filter === 'completed') return { status: 'verified' as ActionStatus }
    return undefined
  }, [filter])

  const { data: actions, isLoading } = useActions(apiFilter)
  const create = useCreateAction()
  const update = useUpdateAction()

  const counts = useMemo(() => {
    const all = actions ?? []
    return {
      all: all.length,
      open: all.filter((a) => a.status === 'open' || a.status === 'in_progress').length,
      overdue: all.filter((a) => a.status === 'overdue').length,
      completed: all.filter((a) => a.status === 'completed' || a.status === 'verified').length,
    }
  }, [actions])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400" />
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Corrective Actions</h1>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="primary">
          <Plus size={14} /> New Action
        </Button>
      </div>

      <div className="flex gap-2 px-6 py-3 border-b border-[var(--color-glass-border)]">
        {(['all', 'open', 'overdue', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 text-xs rounded-lg border transition-colors',
              filter === f
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-[var(--color-glass-bg)] border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="flex-1 px-6 py-4">
        {isLoading ? (
          <p className="text-[var(--color-text-muted)] animate-pulse">Loading...</p>
        ) : !actions || actions.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle size={32} className="mx-auto text-zinc-500 mb-2" />
            <p className="text-[var(--color-text-muted)]">No corrective actions</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <Card key={a.id} className="p-4 hover:border-indigo-500/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">{a.reference}</span>
                      <Badge className={clsx('text-[10px]', ACTION_STATUS_COLORS[a.status])}>
                        {a.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className={clsx('text-[10px] font-semibold uppercase', PRIORITY_COLORS[a.priority])}>
                        {a.priority}
                      </span>
                      <Badge className="text-[10px]">{a.source_type}</Badge>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{a.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-muted)]">
                      {a.due_date && (
                        <span className={clsx(a.status === 'overdue' && 'text-red-400 font-semibold')}>
                          Due: {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {a.completed_at && <span>Completed: {new Date(a.completed_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(a)}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <ActionFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            await create.mutateAsync(data)
            setShowCreate(false)
          }}
        />
      )}
      {editing && (
        <ActionFormModal
          action={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await update.mutateAsync({ ...data, id: editing.id })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

interface ActionFormProps {
  action?: CorrectiveAction
  onClose: () => void
  onSubmit: (data: Partial<CorrectiveAction>) => Promise<void>
}

function ActionFormModal({ action, onClose, onSubmit }: ActionFormProps) {
  const [form, setForm] = useState<Partial<CorrectiveAction>>(action ?? {
    description: '', source_type: 'observation',
    priority: 'medium', status: 'open', due_date: '',
  })
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {action ? `Edit ${action.reference}` : 'New Corrective Action'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            try {
              await onSubmit(form)
            } finally {
              setSubmitting(false)
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Description</label>
            <Textarea
              required
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Source</label>
              <Select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value as ActionSourceType })}>
                {ACTION_SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Priority</label>
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ActionPriority })}>
                {ACTION_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Status</label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ActionStatus })}>
                {ACTION_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Due Date</label>
              <Input
                type="date"
                value={form.due_date?.slice(0, 10) ?? ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : action ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
