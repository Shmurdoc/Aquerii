import { useState } from 'react'
import { Plus, Trash2, History, Sparkles, ToggleLeft, ToggleRight, Play } from 'lucide-react'
import {
  useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation,
} from '@/hooks/useAutomation'
import { TriggerConfig, Action, parseTrigger, parseActions, formatTriggerType } from '@/lib/automation'
import RuleBuilderModal from '@/components/automation/RuleBuilderModal'
import TemplatesPicker  from '@/components/automation/TemplatesPicker'
import RunHistory       from '@/components/automation/RunHistory'
import { Button } from '@/components/ui'

export default function AutomationPage() {
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
        <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Automation Rules</h1>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{automations.length} rules</p>
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => setShowTemplates(true)}>
          <Sparkles size={13} />Templates
        </Button>
        <Button size="sm" onClick={() => { setShowBuilder(true); setPendingTemplate(null) }}>
          <Plus size={13} />New Rule
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Play size={24} className="opacity-50" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No automation rules yet</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowTemplates(true)}>
                <Sparkles size={13} />Browse Templates
              </Button>
              <Button size="sm" onClick={() => { setShowBuilder(true); setPendingTemplate(null) }}>
                <Plus size={13} />Create Rule
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                <th className="px-5 py-3 font-medium w-12" />
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Trigger</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Actions</th>
                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Runs</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {automations.map((rule) => {
                const trigger = parseTrigger(rule.trigger)
                const actions = parseActions(rule.actions)
                return (
                  <tr key={rule.id}
                    onClick={() => {
                      setEditingRule({ id: rule.id, name: rule.name, trigger, actions })
                      setPendingTemplate(null)
                    }}
                    className="group border-b cursor-pointer transition-colors"
                    style={{
                      borderColor: 'var(--color-glass-border)',
                      opacity: !rule.enabled ? 0.6 : undefined,
                    }}
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(rule) }}
                        className="transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        title={rule.enabled ? 'Disable' : 'Enable'}
                      >
                        {rule.enabled ? <ToggleRight size={16} style={{ color: 'var(--color-accent)' }} /> : <ToggleLeft size={16} />}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{rule.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {rule.enabled
                          ? <span style={{ color: 'var(--color-status-success)' }}>Active</span>
                          : <span>Disabled</span>}
                      </p>
                    </td>

                     <td className="px-4 py-3 hidden sm:table-cell">
                       <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-text)' }}>
                         {formatTriggerType(trigger.type)}
                       </span>
                       {trigger.config?.to_status && (
                         <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>→ {trigger.config.to_status}</span>
                       )}
                     </td>

                     <td className="px-4 py-3 hidden md:table-cell">
                       <div className="flex flex-wrap gap-1">
                         {actions.map((a, i) => (
                           <span key={i} className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
                             {a.type.replace(/_/g, ' ')}
                           </span>
                         ))}
                       </div>
                     </td>

                     <td className="px-4 py-3 text-right text-xs font-mono hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                      —
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); setRunHistoryFor({ id: rule.id, name: rule.name }) }}
                          className="p-1"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Run history"
                        >
                          <History size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAutomation.mutate(rule.id) }}
                          className="p-1"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Delete rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
