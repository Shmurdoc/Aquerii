import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { GitBranch, Plus, X, Play, Trash2, Copy, BarChart3, Clock, Users, AlertTriangle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface Scenario {
  id: string
  name: string
  description: string | null
  status: string
  is_baseline: boolean
  snapshot_data: Record<string, unknown>
  simulation_results: Record<string, unknown> | null
  adjustments: ScenarioAdjustment[]
  created_at: string
}

interface ScenarioAdjustment {
  id: string
  adjustment_type: string
  parameters: Record<string, unknown>
  description: string | null
}

const ADJUSTMENT_TYPES = [
  { value: 'add_delay', label: 'Add Delay', icon: '⏰', description: 'Delay a task by X days' },
  { value: 'add_resource', label: 'Add Resource', icon: '👤', description: 'Add team capacity' },
  { value: 'remove_task', label: 'Remove Task', icon: '❌', description: 'Remove task from scope' },
  { value: 'change_scope', label: 'Change Scope', icon: '📏', description: 'Add/remove estimated hours' },
  { value: 'change_deadline', label: 'Change Deadline', icon: '📅', description: 'Adjust task deadline' },
]

export default function ScenariosPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id ?? ''
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [adjType, setAdjType] = useState('add_delay')
  const [adjParams, setAdjParams] = useState<Record<string, string>>({})
  const [adjDesc, setAdjDesc] = useState('')
  const [compareIds, setCompareIds] = useState<string[]>([])

  const { data: scenariosData, isLoading } = useQuery<{ data: Scenario[] }>({
    queryKey: ['scenarios', wid],
    queryFn: () => api.get(`/workspaces/${wid}/scenarios`).then(r => r.data),
    enabled: !!wid,
  })

  const scenarios = scenariosData?.data ?? []

  const createScenario = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post(`/workspaces/${wid}/scenarios`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scenarios', wid] }); setShowNew(false); setNewName(''); setNewDesc('') },
    onError: () => toast.error('Failed to create scenario'),
  })

  const simulate = useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${wid}/scenarios/${id}/simulate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scenarios', wid] }); toast.success('Simulation complete') },
    onError: () => toast.error('Simulation failed'),
  })

  const addAdjustment = useMutation({
    mutationFn: ({ scenarioId, data }: { scenarioId: string; data: Record<string, unknown> }) =>
      api.post(`/workspaces/${wid}/scenarios/${scenarioId}/adjustments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenarios', wid] })
      setShowAdjustment(false)
      setAdjParams({})
      setAdjDesc('')
      toast.success('Adjustment added')
    },
    onError: () => toast.error('Failed to add adjustment'),
  })

  const deleteScenario = useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${wid}/scenarios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scenarios', wid] }); toast.success('Deleted') },
  })

  const selected = scenarios.find(s => s.id === selectedId)

  function handleCreate() {
    if (!newName.trim()) return
    createScenario.mutate({ name: newName, description: newDesc || undefined })
  }

  function handleAddAdjustment() {
    if (!selected) return
    addAdjustment.mutate({
      scenarioId: selected.id,
      data: {
        adjustment_type: adjType,
        parameters: adjParams,
        description: adjDesc || undefined,
      },
    })
  }

  function getParamFields(type: string) {
    switch (type) {
      case 'add_delay':
        return [
          { key: 'task_id', label: 'Task ID', placeholder: 'uuid' },
          { key: 'days', label: 'Days to delay', placeholder: '3' },
        ]
      case 'add_resource':
        return [
          { key: 'hours_per_week', label: 'Hours/week', placeholder: '40' },
        ]
      case 'remove_task':
        return [
          { key: 'task_id', label: 'Task ID', placeholder: 'uuid' },
        ]
      case 'change_scope':
        return [
          { key: 'task_id', label: 'Task ID (optional)', placeholder: 'uuid' },
          { key: 'hours_change', label: 'Hours change (+/-)', placeholder: '10' },
        ]
      case 'change_deadline':
        return [
          { key: 'task_id', label: 'Task ID (optional)', placeholder: 'uuid' },
          { key: 'days_change', label: 'Days change (+/-)', placeholder: '7' },
        ]
      default:
        return []
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] shrink-0">
        <GitBranch size={16} className="text-[var(--color-text-muted)]" />
        <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Scenarios</h1>
        <span className="text-xs text-[var(--color-text-muted)]">What-if simulation</span>
        <div className="flex-1" />
        {compareIds.length >= 2 && (
          <Button size="sm" variant="secondary" onClick={() => {/* compare logic */}}>
            <BarChart3 size={13} /> Compare ({compareIds.length})
          </Button>
        )}
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus size={13} /> New Scenario
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Scenario list */}
        <div className="w-72 border-r border-[var(--color-glass-border)] overflow-y-auto shrink-0">
          {isLoading ? (
            <div className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</div>
          ) : scenarios.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
              No scenarios yet. Create one to start planning.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {scenarios.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedId(scenario.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedId === scenario.id
                      ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {scenario.is_baseline && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">BASE</span>}
                    <span className="truncate">{scenario.name}</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    {scenario.adjustments?.length ?? 0} adjustments
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scenario detail */}
        {selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{selected.name}</h2>
                  {selected.description && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{selected.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => simulate.mutate(selected.id)} disabled={simulate.isPending}>
                    <Play size={12} /> Run Simulation
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteScenario.mutate(selected.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              {/* Simulation results */}
              {selected.simulation_results && (
                <div className="rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Simulation Results</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <ResultCard label="Pending Tasks" value={String(selected.simulation_results.pending_tasks ?? 0)} icon={<BarChart3 size={14} />} />
                    <ResultCard label="Overdue" value={String(selected.simulation_results.overdue_tasks ?? 0)} icon={<AlertTriangle size={14} />} danger={Number(selected.simulation_results.overdue_tasks ?? 0) > 0} />
                    <ResultCard label="Weeks Needed" value={String(selected.simulation_results.weeks_needed ?? 0)} icon={<Clock size={14} />} />
                    <ResultCard label="Risk Score" value={`${selected.simulation_results.risk_score ?? 0}%`} icon={<AlertTriangle size={14} />} danger={Number(selected.simulation_results.risk_score ?? 0) > 50} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[var(--color-bg-hover)] rounded-lg p-3">
                      <p className="text-[var(--color-text-muted)]">Projected Completion</p>
                      <p className="text-[var(--color-text-primary)] font-medium">
                        {selected.simulation_results.projected_completion
                          ? new Date(selected.simulation_results.projected_completion as string).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-[var(--color-bg-hover)] rounded-lg p-3">
                      <p className="text-[var(--color-text-muted)]">Avg Load/Person</p>
                      <p className="text-[var(--color-text-primary)] font-medium">
                        {Number(selected.simulation_results.avg_load_per_person ?? 0)}h/week
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Adjustments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    What-If Adjustments ({selected.adjustments?.length ?? 0})
                  </h3>
                  <Button size="sm" variant="secondary" onClick={() => setShowAdjustment(true)}>
                    <Plus size={12} /> Add Adjustment
                  </Button>
                </div>

                {selected.adjustments?.length === 0 && (
                  <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
                    No adjustments yet. Add one to run a what-if simulation.
                  </div>
                )}

                {selected.adjustments?.map(adj => (
                  <div key={adj.id} className="flex items-center gap-3 bg-[var(--color-bg-hover)] rounded-lg px-4 py-3">
                    <span className="text-lg">
                      {ADJUSTMENT_TYPES.find(t => t.value === adj.adjustment_type)?.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {ADJUSTMENT_TYPES.find(t => t.value === adj.adjustment_type)?.label}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {adj.description || JSON.stringify(adj.parameters)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        api.delete(`/workspaces/${wid}/scenarios/${selected.id}/adjustments/${adj.id}`)
                          .then(() => qc.invalidateQueries({ queryKey: ['scenarios', wid] }))
                      }}
                      className="text-[var(--color-text-muted)] hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
            <div className="text-center">
              <GitBranch size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a scenario or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New scenario modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-surface)] rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--color-text-primary)]">New Scenario</h2>
              <button onClick={() => setShowNew(false)} className="text-[var(--color-text-muted)]"><X size={18} /></button>
            </div>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Scenario name (e.g., 'Add 2 developers')"
              containerClassName="!mb-0"
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add adjustment modal */}
      {showAdjustment && selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-surface)] rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--color-text-primary)]">Add What-If Adjustment</h2>
              <button onClick={() => setShowAdjustment(false)} className="text-[var(--color-text-muted)]"><X size={18} /></button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Type</label>
              <select
                value={adjType}
                onChange={e => { setAdjType(e.target.value); setAdjParams({}) }}
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                {ADJUSTMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {ADJUSTMENT_TYPES.find(t => t.value === adjType)?.description}
              </p>
            </div>

            {getParamFields(adjType).map(field => (
              <div key={field.key} className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">{field.label}</label>
                <input
                  value={adjParams[field.key] ?? ''}
                  onChange={e => setAdjParams(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
                />
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Description (optional)</label>
              <input
                value={adjDesc}
                onChange={e => setAdjDesc(e.target.value)}
                placeholder="Why this adjustment?"
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdjustment(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddAdjustment} disabled={addAdjustment.isPending}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultCard({ label, value, icon, danger = false }: { label: string; value: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className={clsx('rounded-lg p-3 text-center', danger ? 'bg-red-500/10' : 'bg-[var(--color-bg-hover)]')}>
      <div className={clsx('text-lg font-bold', danger ? 'text-red-400' : 'text-[var(--color-text-primary)]')}>{value}</div>
      <div className="text-[10px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">{icon} {label}</div>
    </div>
  )
}
