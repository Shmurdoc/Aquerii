import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSequences, useCreateSequence, useDeleteSequence, useEnrollSequence, type CrmSequenceStep } from '@/lib/crm'
import { Plus, Trash2, Play, Loader2, Mail, Phone, MessageSquare, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'

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
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Sequences</h1>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={12} /> Create sequence
        </Button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
          <Input placeholder="Sequence name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)] font-medium">Steps</span>
              <Button variant="ghost" size="sm" onClick={addStep}><Plus size={10} /> Add step</Button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="bg-[var(--color-bg-elevated)] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select value={step.type} onChange={e => updateStep(i, 'type', e.target.value)}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none">
                    {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Input value={step.subject} onChange={e => updateStep(i, 'subject', e.target.value)} placeholder="Subject"
                    containerClassName="!mb-0 flex-1" className="!text-xs !py-1 !px-2" />
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                    <Clock size={10} />
                    <input type="number" value={step.delay_hours} onChange={e => updateStep(i, 'delay_hours', Number(e.target.value))}
                      className="w-12 bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-1 py-1 text-xs text-[var(--color-text-primary)] text-center outline-none" min={0} />
                    h
                  </div>
                  <button onClick={() => removeStep(i)} className="text-[var(--color-text-muted)] hover:text-red-400"><Trash2 size={12} /></button>
                </div>
                <textarea placeholder="Content / script" value={step.content} onChange={e => updateStep(i, 'content', e.target.value)} rows={2}
                  className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none placeholder-[var(--color-text-muted)] resize-none" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>Save sequence</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
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
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors" onClick={onToggle}>
        <div className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-[var(--color-status-done)]' : 'bg-[var(--color-text-muted)]'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{s.name}</p>
          {s.description && <p className="text-xs text-[var(--color-text-muted)] truncate">{s.description}</p>}
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{s.steps?.length ?? 0} steps</span>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-glass-border)] px-4 py-3 space-y-3">
          <SequenceSteps steps={s.steps ?? []} />
          <div className="border-t border-[var(--color-glass-border)] pt-3">
            <p className="text-xs text-[var(--color-text-muted)] font-medium mb-2">Enroll Contact</p>
            <div className="flex gap-2">
              <Input value={enrollContact} onChange={e => setEnrollContact(e.target.value)} placeholder="Contact ID" containerClassName="!mb-0 flex-1" />
              <Button size="sm" onClick={() => { if (enrollContact.trim()) { enroll.mutate({ sequence_id: s.id, contact_id: enrollContact.trim() }); setEnrollContact('') } }}
                disabled={!enrollContact.trim() || enroll.isPending} loading={enroll.isPending}>
                <Play size={11} /> Enroll
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SequenceSteps({ steps }: { steps: CrmSequenceStep[] }) {
  if (steps.length === 0) return <p className="text-xs text-[var(--color-text-muted)]">No steps defined.</p>

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3 bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2">
          <div className="w-5 h-5 rounded-full bg-[var(--color-bg-input)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)] font-bold">{i + 1}</div>
          <StepIcon type={step.type} />
          <span className="flex-1 text-xs text-[var(--color-text-secondary)] truncate">{step.subject || step.type}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-0.5"><Clock size={8} /> {step.delay_hours}h</span>
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase">{step.type}</span>
        </div>
      ))}
    </div>
  )
}
