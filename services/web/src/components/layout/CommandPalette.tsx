import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface Props { onClose: () => void }

export default function CommandPalette({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const workspace = useAuthStore((s) => s.workspace)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { data: results } = useQuery({
    queryKey: ['search', workspace?.id, query],
    queryFn: () =>
      api.get(`/workspaces/${workspace!.id}/search?q=${encodeURIComponent(query)}`).then((r) => r.data.data),
    enabled: !!workspace && query.length > 1,
  })

  const staticCommands = [
    { label: 'Go to Boards',    action: () => { navigate('/boards');    onClose() } },
    { label: 'Go to Documents', action: () => { navigate('/documents'); onClose() } },
    { label: 'Go to CRM',       action: () => { navigate('/crm');       onClose() } },
    { label: 'Go to Settings',  action: () => { navigate('/settings');  onClose() } },
  ].filter((c) => !query || c.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          type="text"
          placeholder="Search or jump to…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent px-4 py-3 text-gray-100 text-sm placeholder-gray-500 outline-none border-b border-gray-700"
        />
        <div className="max-h-80 overflow-y-auto">
          {staticCommands.map((cmd) => (
            <button
              key={cmd.label}
              onClick={cmd.action}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {cmd.label}
            </button>
          ))}
          {results?.map((r: { id: string; title: string; type: string }) => (
            <button
              key={r.id}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-xs text-gray-500 uppercase mr-2">{r.type}</span>
              {r.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
