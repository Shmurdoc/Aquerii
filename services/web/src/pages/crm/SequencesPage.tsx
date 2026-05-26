import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSequences, useCreateSequence, useUpdateSequence, useDeleteSequence, useEnrollSequence, useUnenrollSequence, useSequenceProgress, CrmSequenceStep } from '@/lib/crm'
import { Plus, Pencil, Trash2, Play, X, Check, Loader2, Mail, Phone, MessageSquare, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const STEP_TYPES = ['email', 'call', 'sms', 'task'] as const

function StepIcon({ type }: { type: string }) {
  switch (type) {
    case 'email': return <Mail size={12} />
    case 'call': return <Phone size={12} />
    case 'sms': return <MessageSquare size={12} />
    default: return <Clock size={12} />
  }
}

export default function SequencesPage() {
  const workspace = useAuthStore(s => s.workspace)
  const { data, isLoading } = useSequences(workspace?.id)
  const createSeq = useCreateSequence(workspace?.id)
  const deleteSeq = useDeleteSequence(workspace?.id)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<CrmSequenceStep[]>([])
  const [enrollContact, setEnrollContact] = useState('')

  const sequences = data?.data ?? []

  if (!workspace) return null

  const addStep = () => {
    setSteps(s => [...s, { type: 'email', subject: '', content: '', delay_hours: 24, order: s.length }])
  }

  const updateStep = (idx: number, field: string, value: any) => {
    setSteps(s => s.map((step, i) => i === idx ? { ...step, [field]: value } : step))
  }

  const removeStep = (idx: number) => {
    setSteps(s => s.filter((_, i) => i !== idx).map((step, i) => ({ ...step, order: i })))
  }

  const handleCreate = () => {
    if (!name.trim()) return
    createSeq.mutate({ name: name.trim(), description: description.trim() || null, steps, type: 'email', is_active: true } as any)
    setShowForm(false)
    setName('')
    setDescription('')
    setSteps([])
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Sequences</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={12} /> Create sequence
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <input placeholder="Sequence name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Steps</span>
              <button onClick={addStep} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><Plus size={10} /> Add step</button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select value={step.type} onChange={e => updateStep(i, 'type', e.target.value)} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white outline-none">
                    {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input placeholder="Subject" value={step.subject} onChange={e => updateStep(i, 'subject', e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white outline-none placeholder-gray-500" />
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={10} />
                    <input type="number" value={step.delay_hours} onChange={e => updateStep(i, 'delay_hours', Number(e.target.value))} className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs text-white outline-none text-center" min={0} />
                    h
                  </div>
                  <button onClick={() => removeStep(i)} className="text-gray-600 hover:text-red-400"><X size={12} /></button>
                </div>
                <textarea placeholder="Content / script" value={step.content} onChange={e => updateStep(i, 'content', e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white outline-none placeholder-gray-500 resize-none" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleCreate} disabled={!name.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
              Save sequence
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
          <Mail size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No sequences yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sequences.map(s => (
            <SequenceCard
              key={s.id}
              sequence={s}
              workspaceId={workspace.id}
              expanded={expanded === s.id}
              onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              onDelete={() => { if (confirm('Delete this sequence?')) deleteSeq.mutate(s.id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SequenceCard({ sequence: s, workspaceId, expanded, onToggle, onDelete }: {
  sequence: any; workspaceId: string; expanded: boolean; onToggle: () => void; onDelete: () => void
}) {
  const enroll = useEnrollSequence(workspaceId)
  const [enrollContact, setEnrollContact] = useState('')

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={onToggle}>
        <div className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-gray-600'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{s.name}</p>
          {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
        </div>
        <span className="text-xs text-gray-600">{s.steps?.length ?? 0} steps</span>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-3">
          <SequenceSteps steps={s.steps ?? []} />
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-500 font-medium mb-2">Enroll Contact</p>
            <div className="flex gap-2">
              <input
                placeholder="Contact ID"
                value={enrollContact}
                onChange={e => setEnrollContact(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600"
              />
              <button
                onClick={() => { if (enrollContact.trim()) { enroll.mutate({ sequence_id: s.id, contact_id: enrollContact.trim() }); setEnrollContact('') } }}
                disabled={!enrollContact.trim() || enroll.isPending}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                <Play size={11} /> Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SequenceSteps({ steps }: { steps: CrmSequenceStep[] }) {
  if (steps.length === 0) return <p className="text-xs text-gray-600">No steps defined.</p>

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-400 font-bold">{i + 1}</div>
          <StepIcon type={step.type} />
          <span className="flex-1 text-xs text-gray-300 truncate">{step.subject || step.type}</span>
          <span className="text-[10px] text-gray-600 flex items-center gap-0.5"><Clock size={8} /> {step.delay_hours}h</span>
          <span className="text-[10px] text-gray-500 uppercase">{step.type}</span>
        </div>
      ))}
    </div>
  )
}
