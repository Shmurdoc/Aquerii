import { useState } from 'react'
import { MentionInput } from '@/components/ui'

export default function MentionTestPage() {
  const [value, setValue] = useState('')
  const [ids, setIds] = useState<string[]>([])

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold text-white">MentionInput Playground</h1>

      <MentionInput
        value={value}
        onChange={(v, mentioned) => {
          setValue(v)
          setIds(mentioned)
        }}
        placeholder="Type @ to mention someone…"
        rows={4}
      />

      <div className="space-y-2 rounded-lg bg-gray-900 p-4 text-sm">
        <div className="text-gray-400">Text value:</div>
        <div className="text-white font-mono whitespace-pre-wrap break-all">{value || '(empty)'}</div>
      </div>

      <div className="space-y-2 rounded-lg bg-gray-900 p-4 text-sm">
        <div className="text-gray-400">Mentioned user IDs:</div>
        <div className="text-indigo-400 font-mono">
          {ids.length > 0 ? `[${ids.join(', ')}]` : '(none)'}
        </div>
      </div>
    </div>
  )
}
