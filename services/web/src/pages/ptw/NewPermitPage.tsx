import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCreatePermit,
  PERMIT_TYPES, PERMIT_RISK_LEVELS, ENERGY_TYPES,
  formatPermitType, isHighRiskType,
  type PermitType, type PermitRiskLevel, type PermitPayload, type EnergyType,
} from '@/lib/ptw'
import { Card, Button, Input, Textarea, Select } from '@/components/ui'
import { ArrowLeft, AlertTriangle, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface HazardDraft { description: string; control_measure: string; residual_risk: 'low' | 'medium' | 'high' }
interface IsolationDraft { isolation_point: string; energy_type: EnergyType; method: string }

export default function NewPermitPage() {
  const navigate = useNavigate()
  const create = useCreatePermit()
  const [form, setForm] = useState<Omit<PermitPayload, 'hazards' | 'isolations'>>({
    type: 'hot_work', title: '', description: '', location: '',
    risk_level: 'medium', work_method_statement: '', ppe_required: '',
    pre_conditions: [],
  })
  const [preCondText, setPreCondText] = useState('')
  const [hazards, setHazards] = useState<HazardDraft[]>([])
  const [isolations, setIsolations] = useState<IsolationDraft[]>([])
  const [submitting, setSubmitting] = useState(false)

  const addHazard = () => setHazards([...hazards, { description: '', control_measure: '', residual_risk: 'low' }])
  const removeHazard = (i: number) => setHazards(hazards.filter((_, idx) => idx !== i))
  const addIsolation = () => setIsolations([...isolations, { isolation_point: '', energy_type: 'electrical' as EnergyType, method: 'LOTO' }])
  const removeIsolation = (i: number) => setIsolations(isolations.filter((_, idx) => idx !== i))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: PermitPayload = {
        ...form,
        pre_conditions: preCondText.split('\n').map((s) => s.trim()).filter(Boolean),
        hazards: hazards.filter((h) => h.description && h.control_measure),
        isolations: isolations.filter((i) => i.isolation_point && i.energy_type && i.method),
      }
      const permit = await create.mutateAsync(payload)
      toast.success(`Created ${permit.reference}`)
      navigate(`/ptw/permits/${permit.id}`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create permit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <button onClick={() => navigate('/ptw/permits')} className="p-1 hover:bg-zinc-800 rounded">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">New Permit to Work</h1>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-4 max-w-3xl">
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Work</h2>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Title</label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Welding repairs on conveyor 2"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Description</label>
            <Textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Type</label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as PermitType })}
              >
                {PERMIT_TYPES.map((t) => <option key={t} value={t}>{formatPermitType(t)}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Risk level</label>
              <Select
                value={form.risk_level}
                onChange={(e) => setForm({ ...form, risk_level: e.target.value as PermitRiskLevel })}
              >
                {PERMIT_RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Location</label>
              <Input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Shaft 1 - Level 3"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Equipment ID (optional)</label>
              <Input
                value={form.equipment_id ?? ''}
                onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
                placeholder="EQ-1234"
              />
            </div>
          </div>
          {isHighRiskType(form.type) && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
              <AlertTriangle size={14} />
              High-risk type: DMR inspector audit likely. Ensure all controls are documented.
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Controls</h2>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Work method statement</label>
            <Textarea
              required
              rows={4}
              value={form.work_method_statement}
              onChange={(e) => setForm({ ...form, work_method_statement: e.target.value })}
              placeholder="Step-by-step procedure"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">PPE required</label>
            <Input
              required
              value={form.ppe_required}
              onChange={(e) => setForm({ ...form, ppe_required: e.target.value })}
              placeholder="Hard hat, gloves, face shield"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Pre-conditions (one per line)</label>
            <Textarea
              rows={3}
              value={preCondText}
              onChange={(e) => setPreCondText(e.target.value)}
              placeholder={'Gas test < 1% LEL\nArea barricaded\nRescue plan briefed'}
            />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" /> Hazards
            </h2>
            <Button type="button" size="xs" variant="outline" onClick={addHazard}>
              <Plus size={12} /> Add hazard
            </Button>
          </div>
          {hazards.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No hazards added. The permit can still be created, but DMR expects controls for high-risk work.</p>
          ) : (
            hazards.map((h, i) => (
              <div key={i} className="border border-[var(--color-glass-border)] rounded p-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-muted)]">Hazard #{i + 1}</span>
                  <button type="button" onClick={() => removeHazard(i)} className="text-red-400 hover:bg-red-500/10 rounded p-1">
                    <X size={12} />
                  </button>
                </div>
                <Input
                  required
                  placeholder="Description"
                  value={h.description}
                  onChange={(e) => setHazards(hazards.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                />
                <Input
                  required
                  placeholder="Control measure"
                  value={h.control_measure}
                  onChange={(e) => setHazards(hazards.map((x, idx) => idx === i ? { ...x, control_measure: e.target.value } : x))}
                />
                <Select
                  value={h.residual_risk}
                  onChange={(e) => setHazards(hazards.map((x, idx) => idx === i ? { ...x, residual_risk: e.target.value as 'low' | 'medium' | 'high' } : x))}
                >
                  <option value="low">low residual</option>
                  <option value="medium">medium residual</option>
                  <option value="high">high residual</option>
                </Select>
              </div>
            ))
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Isolations (LOTO)</h2>
            <Button type="button" size="xs" variant="outline" onClick={addIsolation}>
              <Plus size={12} /> Add isolation
            </Button>
          </div>
          {isolations.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No isolations recorded.</p>
          ) : (
            isolations.map((iso, i) => (
              <div key={i} className="border border-[var(--color-glass-border)] rounded p-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-muted)]">Isolation #{i + 1}</span>
                  <button type="button" onClick={() => removeIsolation(i)} className="text-red-400 hover:bg-red-500/10 rounded p-1">
                    <X size={12} />
                  </button>
                </div>
                <Input
                  required
                  placeholder="Isolation point"
                  value={iso.isolation_point}
                  onChange={(e) => setIsolations(isolations.map((x, idx) => idx === i ? { ...x, isolation_point: e.target.value } : x))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={iso.energy_type}
                    onChange={(e) => setIsolations(isolations.map((x, idx) => idx === i ? { ...x, energy_type: e.target.value } : x))}
                  >
                    {['electrical', 'mechanical', 'hydraulic', 'pneumatic', 'thermal', 'chemical', 'gravitational', 'radioactive'].map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </Select>
                  <Input
                    required
                    placeholder="Method"
                    value={iso.method}
                    onChange={(e) => setIsolations(isolations.map((x, idx) => idx === i ? { ...x, method: e.target.value } : x))}
                  />
                </div>
              </div>
            ))
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/ptw/permits')}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create draft'}
          </Button>
        </div>
      </form>
    </div>
  )
}
