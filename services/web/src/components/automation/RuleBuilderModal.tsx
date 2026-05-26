import { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  TriggerConfig, TriggerType, Action, ActionType,
  TRIGGER_TYPES, ACTION_TYPES, formatTriggerType,
} from '@/lib/automation'

interface Props {
  initial?: { name: string; trigger: TriggerConfig; actions: Action[] }
  onSave: (name: string, trigger: TriggerConfig, actions: Action[]) => void
  onClose: () => void
  isPending?: boolean
}

export default function RuleBuilderModal({ initial, onSave, onClose, isPending }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [trigger, setTrigger] = useState<TriggerConfig>(
    initial?.trigger ?? { type: 'item.created', config: {} }
  )
  const [actions, setActions] = useState<Action[]>(
    initial?.actions ?? [{ type: 'change_status', value: '' }]
  )

  function updateTrigger(type: TriggerType) {
    setTrigger({ type, config: {} })
  }

  function updateTriggerConfig(key: string, value: any) {
    setTrigger((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }))
  }

  function addAction() {
    setActions((prev) => [...prev, { type: 'change_status', value: '' }])
  }

  function removeAction(i: number) {
    setActions((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateAction(i: number, patch: Partial<Action>) {
    setActions((prev) => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const before = actions.length
    const validActions = actions.filter((a) => {
      if (a.type === 'change_status') return a.value?.trim()
      if (a.type === 'assign_user') return a.user_id
      if (a.type === 'send_notification') return a.title?.trim()
      if (a.type === 'move_item') return a.group_id
      if (a.type === 'create_item') return a.title?.trim() && a.group_id
      return true
    })
    const filtered = before - validActions.length
    if (filtered > 0) toast.error(`${filtered} action(s) removed — incomplete fields`)
    if (!name.trim() || validActions.length === 0) return
    onSave(name.trim(), trigger, validActions)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="font-semibold text-gray-100">{initial ? 'Edit Rule' : 'New Rule'}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Rule Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Close item when status changes to Done"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>

          {/* Trigger */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Trigger</label>
            <select value={trigger.type} onChange={(e) => updateTrigger(e.target.value as TriggerType)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
              {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{formatTriggerType(t)}</option>)}
            </select>

            {trigger.type === 'status.changed' && (
              <input value={trigger.config?.to_status ?? ''} onChange={(e) => updateTriggerConfig('to_status', e.target.value)}
                placeholder="Target status value (e.g. 'done')"
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            )}
            {trigger.type === 'assignee.added' && (
              <p className="text-xs text-gray-500">Fires when a user is assigned to an item (no config needed)</p>
            )}
            {(trigger.type === 'item.created' || trigger.type === 'item.updated' || trigger.type === 'item.deleted') && (
              <p className="text-xs text-gray-500">Fires when an item is {trigger.type.split('.')[1]} (no config needed)</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Actions</label>
              <button type="button" onClick={addAction}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                <Plus size={12} />Add action
              </button>
            </div>

            {actions.length === 0 && (
              <p className="text-xs text-gray-600">Add at least one action</p>
            )}

            <div className="flex flex-col gap-3">
              {actions.map((action, i) => (
                <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Action {i + 1}</span>
                    <button type="button" onClick={() => removeAction(i)}
                      className="text-gray-600 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <select value={action.type} onChange={(e) => updateAction(i, { type: e.target.value as ActionType })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-indigo-500">
                    {ACTION_TYPES.map((at) => <option key={at.value} value={at.value}>{at.label}</option>)}
                  </select>

                  {action.type === 'change_status' && (
                    <input value={action.value ?? ''} onChange={(e) => updateAction(i, { value: e.target.value })}
                      placeholder="Status value (e.g. 'closed')"
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                  )}
                  {action.type === 'assign_user' && (
                    <input value={action.user_id ?? ''} onChange={(e) => updateAction(i, { user_id: e.target.value })}
                      placeholder="User ID"
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono" />
                  )}
                  {action.type === 'send_notification' && (
                    <div className="flex flex-col gap-2">
                      <input value={action.title ?? ''} onChange={(e) => updateAction(i, { title: e.target.value })}
                        placeholder="Notification title"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                      <input value={action.body ?? ''} onChange={(e) => updateAction(i, { body: e.target.value })}
                        placeholder="Notification body"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                      <input value={action.user_id ?? ''} onChange={(e) => updateAction(i, { user_id: e.target.value })}
                        placeholder="Recipient user ID"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono" />
                    </div>
                  )}
                  {action.type === 'move_item' && (
                    <input value={action.group_id ?? ''} onChange={(e) => updateAction(i, { group_id: e.target.value })}
                      placeholder="Group ID"
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono" />
                  )}
                  {action.type === 'create_item' && (
                    <div className="flex flex-col gap-2">
                      <input value={action.title ?? ''} onChange={(e) => updateAction(i, { title: e.target.value })}
                        placeholder="Item title"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                      <input value={action.group_id ?? ''} onChange={(e) => updateAction(i, { group_id: e.target.value })}
                        placeholder="Group ID"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button type="submit" disabled={isPending || !name.trim() || actions.length === 0}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {isPending ? 'Saving…' : initial ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </form>
    </div>
  )
}
