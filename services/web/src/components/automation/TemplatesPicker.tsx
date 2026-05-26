import { useState } from 'react'
import { X, Sparkles, Search } from 'lucide-react'
import { useAutomationTemplates } from '@/hooks/useAutomation'
import { AutomationTemplate, TriggerConfig, Action, formatTriggerType } from '@/lib/automation'

interface Props {
  onApply: (name: string, trigger: TriggerConfig, actions: Action[]) => void
  onClose: () => void
}

export default function TemplatesPicker({ onApply, onClose }: Props) {
  const [category, setCategory] = useState<string>('')
  const [search, setSearch]     = useState('')

  const { data: templates = [], isLoading } = useAutomationTemplates(category || undefined)

  const categories = [...new Set(templates.map((t) => t.category))].sort()

  const filtered = search
    ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()))
    : templates

  function handleApply(tpl: AutomationTemplate) {
    let trigger: TriggerConfig
    try { trigger = JSON.parse(tpl.trigger_config) } catch { trigger = { type: tpl.trigger_type } }
    let actions: Action[]
    try { actions = JSON.parse(tpl.actions) } catch { actions = [] }
    onApply(tpl.name, { type: tpl.trigger_type, config: trigger.config || trigger }, actions)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="font-semibold text-gray-100 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            Automation Templates
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-800/60">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…"
              className="bg-gray-800 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-full" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-indigo-500">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">No templates found</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((tpl) => (
                <button key={tpl.id} onClick={() => handleApply(tpl)}
                  className="text-left bg-gray-800/50 border border-gray-700 hover:border-indigo-600 rounded-lg p-4 transition-colors group">
                  <p className="text-sm font-medium text-gray-200 group-hover:text-indigo-300 transition-colors">{tpl.name}</p>
                  {tpl.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-indigo-400 bg-indigo-400/10 rounded px-1.5 py-0.5">
                      {formatTriggerType(tpl.trigger_type)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-600">{tpl.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-800 flex justify-end flex-shrink-0">
          <button onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
        </div>
      </div>
    </div>
  )
}
