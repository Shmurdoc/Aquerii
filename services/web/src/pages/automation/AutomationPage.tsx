import { useState } from 'react'
import { Plus, Trash2, History, Sparkles, ToggleLeft, ToggleRight, Play } from 'lucide-react'
import {
  useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation,
} from '@/hooks/useAutomation'
import { TriggerConfig, Action, parseTrigger, parseActions, formatTriggerType } from '@/lib/automation'
import RuleBuilderModal from '@/components/automation/RuleBuilderModal'
import TemplatesPicker  from '@/components/automation/TemplatesPicker'
import RunHistory       from '@/components/automation/RunHistory'

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
    // prefills the builder with the template
    setShowBuilder(true)
    // Store template data to be picked up by the builder
    // Actually, the builder already has default state. We need to pass initial data.
    // Let's set editingRule-like state for the builder
    // But editingRule expects an id, which we don't have yet...
    // Use a different approach - override via a ref or state
    setPendingTemplate({ name, trigger, actions })
  }

  // Store template data temporarily
  const [pendingTemplate, setPendingTemplate] = useState<{ name: string; trigger: TriggerConfig; actions: Action[] } | null>(null)

  const isPending = createAutomation.isPending || updateAutomation.isPending || toggleMutation.isPending

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
        <h1 className="text-base font-semibold text-gray-100">Automation Rules</h1>
        <p className="text-xs text-gray-500">{automations.length} rules</p>
        <div className="flex-1" />
        <button onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
          <Sparkles size={13} />Templates
        </button>
        <button onClick={() => { setShowBuilder(true); setPendingTemplate(null) }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={13} />New Rule
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
        ) : automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Play size={24} className="text-gray-700" />
            <p className="text-gray-500 text-sm">No automation rules yet</p>
            <div className="flex gap-2">
              <button onClick={() => setShowTemplates(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
                <Sparkles size={13} />Browse Templates
              </button>
              <button onClick={() => { setShowBuilder(true); setPendingTemplate(null) }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus size={13} />Create Rule
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
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
                    className={`group border-b border-gray-800/60 hover:bg-gray-800/30 cursor-pointer transition-colors ${!rule.enabled ? 'opacity-60' : ''}`}
                  >
                    {/* Toggle */}
                    <td className="px-5 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(rule) }}
                        className="text-gray-500 hover:text-gray-200 transition-colors"
                        title={rule.enabled ? 'Disable' : 'Enable'}
                      >
                        {rule.enabled ? <ToggleRight size={16} className="text-indigo-400" /> : <ToggleLeft size={16} />}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-gray-200 font-medium">{rule.name}</p>
                      <p className="text-xs text-gray-500">
                        {rule.enabled
                          ? <span className="text-emerald-400">Active</span>
                          : <span className="text-gray-500">Disabled</span>}
                      </p>
                    </td>

                     <td className="px-4 py-3 hidden sm:table-cell">
                       <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-400/10 text-indigo-400 capitalize">
                         {formatTriggerType(trigger.type)}
                       </span>
                       {trigger.config?.to_status && (
                         <span className="text-xs text-gray-500 ml-2">→ {trigger.config.to_status}</span>
                       )}
                     </td>

                     <td className="px-4 py-3 hidden md:table-cell">
                       <div className="flex flex-wrap gap-1">
                         {actions.map((a, i) => (
                           <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 capitalize">
                             {a.type.replace(/_/g, ' ')}
                           </span>
                         ))}
                       </div>
                     </td>

                     <td className="px-4 py-3 text-right text-xs text-gray-500 font-mono hidden sm:table-cell">
                      {/* run_count isn't returned by the controller since it uses DB::table
                          and the column might not exist. Show empty for now */}
                      —
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); setRunHistoryFor({ id: rule.id, name: rule.name }) }}
                          className="text-gray-500 hover:text-gray-200 p-1"
                          title="Run history"
                        >
                          <History size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAutomation.mutate(rule.id) }}
                          className="text-gray-500 hover:text-red-400 p-1"
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

      {/* Modals */}
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
