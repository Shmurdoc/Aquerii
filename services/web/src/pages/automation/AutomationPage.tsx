import { useState } from 'react'
import { Plus, Trash2, History, Sparkles, ToggleLeft, ToggleRight, Play, Lightbulb, Check, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import {
  useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation,
} from '@/hooks/useAutomation'
import { TriggerConfig, Action, parseTrigger, parseActions, formatTriggerType } from '@/lib/automation'
import RuleBuilderModal from '@/components/automation/RuleBuilderModal'
import TemplatesPicker  from '@/components/automation/TemplatesPicker'
import RunHistory       from '@/components/automation/RunHistory'
import { Button } from '@/components/ui'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface Recommendation {
  id: string
  title: string
  description: string | null
  category: string | null
  priority: string
  pattern_type: string
  evidence: Record<string, unknown>
  status: string
}

export default function AutomationPage() {
  const [tab, setTab] = useState<'rules' | 'recommendations'>('rules')
  const [showBuilder, setShowBuilder]     = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingRule, setEditingRule]     = useState<{ id: string; name: string; trigger: TriggerConfig; actions: Action[] } | null>(null)
  const [runHistoryFor, setRunHistoryFor] = useState<{ id: string; name: string } | null>(null)

  const { data: automations = [], isLoading } = useAutomations()
  const createAutomation  = useCreateAutomation()
  const updateAutomation  = useUpdateAutomation()
  const deleteAutomation  = useDeleteAutomation()
  const toggleMutation    = useUpdateAutomation()

  function handleSave(name: string, trigger: TriggerConfig, actions: Action[]) {
    if (editingRule) {
      updateAutomation.mutate({ id: editingRule.id, payload: { name, trigger, actions } })
      setEditingRule(null)
    } else {
      createAutomation.mutate({ name, trigger, actions })
    }
    setShowBuilder(false)
  }

  function handleToggle(automation: { id: string; enabled: boolean }) {
    toggleMutation.mutate({ id: automation.id, payload: { enabled: !automation.enabled } })
  }

  function handleTemplateApply(name: string, trigger: TriggerConfig, actions: Action[]) {
    setShowTemplates(false)
    setEditingRule(null)
    setShowBuilder(true)
    setPendingTemplate({ name, trigger, actions })
  }

  const [pendingTemplate, setPendingTemplate] = useState<{ name: string; trigger: TriggerConfig; actions: Action[] } | null>(null)

  const isPending = createAutomation.isPending || updateAutomation.isPending || toggleMutation.isPending

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
        <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Automation</h1>
        <div className="flex gap-1 ml-4">
          <button
            onClick={() => setTab('rules')}
            className={clsx('text-xs px-3 py-1 rounded transition-colors', tab === 'rules' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]')}
          >
            Rules ({automations.length})
          </button>
          <button
            onClick={() => setTab('recommendations')}
            className={clsx('text-xs px-3 py-1 rounded transition-colors', tab === 'recommendations' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]')}
          >
            <Lightbulb size={12} className="inline mr-1" /> Recommendations
          </button>
        </div>
        <div className="flex-1" />
        {tab === 'rules' && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setShowTemplates(true)}>
              <Sparkles size={13} />Templates
            </Button>
            <Button size="sm" onClick={() => { setShowBuilder(true); setPendingTemplate(null) }}>
              <Plus size={13} />New Rule
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'rules' ? (
          <RulesTab
            automations={automations}
            isLoading={isLoading}
            onToggle={handleToggle}
            onEdit={(rule) => { setEditingRule(rule); setPendingTemplate(null) }}
            onDelete={(id) => deleteAutomation.mutate(id)}
            onHistory={(id, name) => setRunHistoryFor({ id, name })}
            onBrowseTemplates={() => setShowTemplates(true)}
            onNewRule={() => { setShowBuilder(true); setPendingTemplate(null) }}
          />
        ) : (
          <RecommendationsTab />
        )}
      </div>

      {showBuilder && (
        <RuleBuilderModal
          initial={pendingTemplate ?? editingRule ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowBuilder(false); setEditingRule(null); setPendingTemplate(null) }}
          isPending={isPending}
        />
      )}

      {showTemplates && (
        <TemplatesPicker
          onApply={(name, trigger, actions) => {
            setPendingTemplate({ name, trigger, actions })
            setShowTemplates(false)
            setShowBuilder(true)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {runHistoryFor && (
        <RunHistory
          automationId={runHistoryFor.id}
          automationName={runHistoryFor.name}
          onClose={() => setRunHistoryFor(null)}
        />
      )}
    </div>
  )
}

function RulesTab({ automations, isLoading, onToggle, onEdit, onDelete, onHistory, onBrowseTemplates, onNewRule }: {
  automations: any[]
  isLoading: boolean
  onToggle: (rule: any) => void
  onEdit: (rule: any) => void
  onDelete: (id: string) => void
  onHistory: (id: string, name: string) => void
  onBrowseTemplates: () => void
  onNewRule: () => void
}) {
  if (isLoading) {
    return <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
  }

  if (automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <Play size={24} className="opacity-50" />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No automation rules yet</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onBrowseTemplates}>
            <Sparkles size={13} />Browse Templates
          </Button>
          <Button size="sm" onClick={onNewRule}>
            <Plus size={13} />Create Rule
          </Button>
        </div>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          <th className="px-5 py-3 font-medium w-12" />
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium hidden sm:table-cell">Trigger</th>
          <th className="px-4 py-3 font-medium hidden md:table-cell">Actions</th>
          <th className="px-4 py-3 font-medium w-24" />
        </tr>
      </thead>
      <tbody>
        {automations.map((rule) => {
          const trigger = parseTrigger(rule.trigger)
          const actions = parseActions(rule.actions)
          return (
            <tr key={rule.id}
              onClick={() => onEdit({ id: rule.id, name: rule.name, trigger, actions })}
              className="group border-b cursor-pointer transition-colors"
              style={{ borderColor: 'var(--color-glass-border)', opacity: !rule.enabled ? 0.6 : undefined }}
            >
              <td className="px-5 py-3">
                <button onClick={(e) => { e.stopPropagation(); onToggle(rule) }} style={{ color: 'var(--color-text-muted)' }}>
                  {rule.enabled ? <ToggleRight size={16} style={{ color: 'var(--color-accent)' }} /> : <ToggleLeft size={16} />}
                </button>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{rule.name}</p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-text)' }}>
                  {formatTriggerType(trigger.type)}
                </span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {actions.map((a: any, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
                      {a.type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); onHistory(rule.id, rule.name) }} style={{ color: 'var(--color-text-muted)' }}><History size={13} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(rule.id) }} style={{ color: 'var(--color-text-muted)' }}><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function RecommendationsTab() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id ?? ''
  const qc = useQueryClient()

  const { data: recsData, isLoading } = useQuery<{ data: Recommendation[] }>({
    queryKey: ['automation-recommendations', wid],
    queryFn: () => api.get(`/workspaces/${wid}/automation-recommendations`).then(r => r.data),
    enabled: !!wid,
  })

  const refresh = useMutation({
    mutationFn: () => api.post(`/workspaces/${wid}/automation-recommendations/refresh`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-recommendations', wid] }); toast.success('Patterns scanned') },
  })

  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${wid}/automation-recommendations/${id}/accept`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-recommendations', wid] }); qc.invalidateQueries({ queryKey: ['automations'] }); toast.success('Automation created') },
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/workspaces/${wid}/automation-recommendations/${id}/dismiss`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-recommendations', wid] }) },
  })

  const recommendations = recsData?.data ?? []

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          AI-detected patterns from your workspace activity
        </p>
        <Button size="sm" variant="secondary" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <Sparkles size={12} /> Scan Patterns
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No recommendations yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Click "Scan Patterns" to analyze your workspace</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map(rec => (
            <div key={rec.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-glass-bg)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{rec.title}</h3>
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', {
                      'bg-red-500/20 text-red-400': rec.priority === 'high',
                      'bg-yellow-500/20 text-yellow-400': rec.priority === 'medium',
                      'bg-gray-500/20 text-gray-400': rec.priority === 'low',
                    })}>{rec.priority}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
                      {rec.pattern_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {rec.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{rec.description}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => accept.mutate(rec.id)} disabled={accept.isPending}>
                    <Check size={12} /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss.mutate(rec.id)} disabled={dismiss.isPending}>
                    <X size={12} /> Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
