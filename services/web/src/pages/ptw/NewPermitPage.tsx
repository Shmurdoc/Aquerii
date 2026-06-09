import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCreatePermit,
  PERMIT_TYPES,
  formatPermitType,
  isHighRiskType,
  type PermitType,
} from '@/lib/ptw'
import { Card, Button, Input, Textarea, Select, Badge } from '@/components/ui'
import { ArrowLeft, AlertTriangle, Plus, X, Check, ChevronRight, User, ClipboardList, MapPin, FileText, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LOCATION_SHAFTS = ['Shaft 1', 'Shaft 2', 'Shaft 3', 'Shaft 4', 'Shaft 5']
const LOCATION_LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']
const LOCATION_SECTIONS = ['Section A', 'Section B', 'Section C', 'Section D']

const STEPS = [
  { id: 0, label: 'Type & Location', icon: MapPin },
  { id: 1, label: 'Work Details', icon: FileText },
  { id: 2, label: 'Workers', icon: User },
  { id: 3, label: 'Review & Submit', icon: ClipboardList },
]

interface HazardDraft {
  id: string
  description: string
  control_measure: string
}

export default function NewPermitPage() {
  const navigate = useNavigate()
  const create = useCreatePermit()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 state
  const [type, setType] = useState<PermitType>('hot_work')
  const [shaft, setShaft] = useState('')
  const [level, setLevel] = useState('')
  const [section, setSection] = useState('')

  // Step 2 state
  const [description, setDescription] = useState('')
  const [hazards, setHazards] = useState<HazardDraft[]>([{ id: crypto.randomUUID(), description: '', control_measure: '' }])
  const [workMethod, setWorkMethod] = useState('')

  // Step 3 state
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([])

  // Validation
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const location = [shaft, level, section].filter(Boolean).join(' - ')

  const descLength = description.length
  const descValid = descLength >= 100

  const allFieldsStep1 = type && shaft && level && section
  const allFieldsStep2 = descValid && workMethod.length > 0 && hazards.every(h => h.description && h.control_measure)
  const allFieldsStep3 = assignedWorkers.length > 0

  const canAdvance = (s: number) => {
    switch (s) {
      case 0: return allFieldsStep1
      case 1: return allFieldsStep2
      case 2: return allFieldsStep3
      default: return true
    }
  }

  const addHazard = () => setHazards([...hazards, { id: crypto.randomUUID(), description: '', control_measure: '' }])

  const removeHazard = (id: string) => {
    if (hazards.length <= 1) return
    setHazards(hazards.filter(h => h.id !== id))
  }

  const updateHazard = (id: string, field: 'description' | 'control_measure', value: string) => {
    setHazards(hazards.map(h => h.id === id ? { ...h, [field]: value } : h))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await create.mutateAsync({
        type,
        title: `${formatPermitType(type)} - ${shaft} ${level} ${section}`,
        description,
        location,
        risk_level: isHighRiskType(type) ? 'high' : 'medium',
        work_method_statement: workMethod,
        ppe_required: 'As per risk assessment',
        hazards: hazards.filter(h => h.description && h.control_measure).map(h => ({
          description: h.description,
          control_measure: h.control_measure,
          residual_risk: 'medium' as const,
        })),
      })
      toast.success('Permit created successfully')
      navigate('/ptw/permits')
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error).message
        ?? 'Failed to create permit'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderProgress = () => (
    <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--color-glass-border)]">
      {STEPS.map((s, i) => {
        const isActive = i === step
        const isDone = i < step
        return (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button
              type="button"
              disabled={!canAdvance(i) && i > step}
              onClick={() => {
                if (canAdvance(i) || i < step) setStep(i)
              }}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-medium transition-colors',
                isActive && 'text-[var(--color-accent-text)]',
                isDone && 'text-emerald-400',
                !isActive && !isDone && 'text-[var(--color-text-muted)]',
              )}
            >
              <span className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border',
                isActive && 'border-[var(--color-accent)] bg-[var(--color-accent-light)]',
                isDone && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                !isActive && !isDone && 'border-[var(--color-glass-border)] bg-[var(--color-bg-elevated)]',
              )}>
                {isDone ? <Check size={10} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'flex-1 h-px mx-1',
                i < step ? 'bg-emerald-500/50' : 'bg-[var(--color-glass-border)]',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Permit Type</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {PERMIT_TYPES.map(t => {
            const isHigh = isHighRiskType(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={clsx(
                  'relative p-3 rounded-lg border text-left transition-all',
                  type === t
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                    : 'border-[var(--color-glass-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-glass-border-hover)]',
                )}
              >
                <p className="text-xs font-medium text-[var(--color-text-primary)]">{formatPermitType(t)}</p>
                {isHigh && (
                  <Badge size="sm" variant="warning" className="mt-1">High risk</Badge>
                )}
                {type === t && (
                  <Check size={12} className="absolute top-2 right-2 text-[var(--color-accent)]" />
                )}
              </button>
            )
          })}
        </div>
        {isHighRiskType(type) && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
            <AlertTriangle size={14} />
            High-risk type: DMR inspector audit likely. Ensure all controls are documented.
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Location</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Shaft"
            value={shaft}
            onChange={(e) => { setShaft(e.target.value); setTouched({ ...touched, shaft: true }) }}
          >
            <option value="">Select shaft</option>
            {LOCATION_SHAFTS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select
            label="Level"
            value={level}
            onChange={(e) => { setLevel(e.target.value); setTouched({ ...touched, level: true }) }}
          >
            <option value="">Select level</option>
            {LOCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Select
            label="Section"
            value={section}
            onChange={(e) => { setSection(e.target.value); setTouched({ ...touched, section: true }) }}
          >
            <option value="">Select section</option>
            {LOCATION_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Work Description</h2>
        <Textarea
          label="Describe the work to be performed"
          placeholder="Provide a detailed description of the work (minimum 100 characters)..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          currentLength={descLength}
          error={touched.description && !descValid ? `Minimum 100 characters required (${descLength}/100)` : undefined}
        />
        <div className="flex items-center justify-between">
          <span className={clsx('text-xs', descValid ? 'text-emerald-400' : 'text-[var(--color-text-muted)]')}>
            {descValid ? <><CheckCircle2 size={12} className="inline mr-1" />Sufficient detail</> : `${descLength}/100 characters minimum`}
          </span>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Hazards & Controls</h2>
          <Button type="button" size="xs" variant="outline" onClick={addHazard}>
            <Plus size={12} /> Add hazard
          </Button>
        </div>
        {hazards.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No hazards identified. At least one is required.</p>
        ) : (
          hazards.map((h, i) => (
            <div key={h.id} className="border border-[var(--color-glass-border)] rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">Hazard #{i + 1}</span>
                {hazards.length > 1 && (
                  <button type="button" onClick={() => removeHazard(h.id)} className="text-red-400 hover:bg-red-500/10 rounded p-1">
                    <X size={12} />
                  </button>
                )}
              </div>
              <Input
                placeholder="Describe the hazard"
                value={h.description}
                onChange={(e) => updateHazard(h.id, 'description', e.target.value)}
              />
              <Input
                placeholder="Control measure"
                value={h.control_measure}
                onChange={(e) => updateHazard(h.id, 'control_measure', e.target.value)}
              />
            </div>
          ))
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Work Method Statement</h2>
        <Textarea
          label="Step-by-step procedure"
          placeholder="Describe the step-by-step method for performing this work safely..."
          rows={4}
          value={workMethod}
          onChange={(e) => setWorkMethod(e.target.value)}
        />
      </Card>
    </div>
  )

  const mockWorkers = useMemo(() => [
    { id: '1', name: 'John Mokoena', badge: 'WM-001', status: 'compliant' as const, role: 'Welder' },
    { id: '2', name: 'Thabo Ndlovu', badge: 'WM-002', status: 'compliant' as const, role: 'Rigger' },
    { id: '3', name: 'Samuel Botha', badge: 'WM-003', status: 'non_compliant' as const, role: 'Electrician', reason: 'Medical fitness expired' },
    { id: '4', name: 'Pieter van der Merwe', badge: 'WM-004', status: 'expiring' as const, role: 'Fitter', reason: 'SHE induction expires in 14 days' },
    { id: '5', name: 'David Mkhize', badge: 'WM-005', status: 'compliant' as const, role: 'Supervisor' },
    { id: '6', name: 'Kabelo Molefe', badge: 'WM-006', status: 'compliant' as const, role: 'Safety Officer' },
    { id: '7', name: 'Jacob Zulu', badge: 'WM-007', status: 'compliant' as const, role: 'Operator' },
    { id: '8', name: 'Michael de Bruyn', badge: 'WM-008', status: 'non_compliant' as const, role: 'Driver', reason: 'No valid driver\'s license on file' },
  ], [])

  const toggleWorker = (id: string) => {
    setAssignedWorkers(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    )
  }

  const renderStep3 = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Assign Workers</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Select workers for this permit. Only compliant workers can be selected.
        </p>
        <div className="space-y-1">
          {mockWorkers.map(w => {
            const selected = assignedWorkers.includes(w.id)
            const canSelect = w.status === 'compliant' || w.status === 'expiring'
            return (
              <div
                key={w.id}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all',
                  selected && 'border-[var(--color-accent)] bg-[var(--color-accent-light)]',
                  !selected && canSelect && 'border-[var(--color-glass-border)] hover:border-[var(--color-glass-border-hover)]',
                  !canSelect && 'border-red-500/20 bg-red-500/5 opacity-70',
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={w.status === 'non_compliant'}
                  onChange={() => canSelect && toggleWorker(w.id)}
                  className="rounded border-[var(--color-glass-border)] bg-[var(--color-bg-input)] accent-[var(--color-accent)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{w.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{w.role} • {w.badge}</p>
                </div>
                {w.status === 'non_compliant' ? (
                  <Badge variant="danger" size="sm">Non-compliant</Badge>
                ) : w.status === 'expiring' ? (
                  <Badge variant="warning" size="sm">Expiring</Badge>
                ) : (
                  <Badge variant="success" size="sm">Compliant</Badge>
                )}
              </div>
            )
          })}
        </div>
        {assignedWorkers.length === 0 && (
          <p className="text-xs text-amber-400 mt-2">Select at least one worker to continue.</p>
        )}
      </Card>
    </div>
  )

  const renderStep4 = () => {
    const selectedWorkers = mockWorkers.filter(w => assignedWorkers.includes(w.id))
    return (
      <div className="space-y-4 animate-fade-in">
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Review Permit</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">Type</span>
              <p className="font-medium">{formatPermitType(type)}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">Location</span>
              <p className="font-medium">{location}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-[var(--color-text-muted)]">Description</span>
              <p className="text-sm whitespace-pre-wrap mt-1">{description}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-[var(--color-text-muted)]">Hazards ({hazards.filter(h => h.description).length})</span>
              <ul className="text-sm mt-1 space-y-1">
                {hazards.filter(h => h.description).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle size={10} className="text-amber-400 mt-0.5 shrink-0" />
                    <span><strong>{h.description}</strong> — {h.control_measure}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-[var(--color-text-muted)]">Assigned Workers ({selectedWorkers.length})</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedWorkers.map(w => (
                  <Badge key={w.id} size="sm">{w.name}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setStep(0)}>
            Edit
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            loading={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Permit'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <button onClick={() => navigate('/ptw/permits')} className="p-1 hover:bg-[var(--color-bg-hover)] rounded">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">New Permit to Work</h1>
      </div>

      {renderProgress()}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (step < 3) {
            if (canAdvance(step)) setStep(step + 1)
            else setTouched({ ...touched, description: true })
          } else {
            handleSubmit()
          }
        }}
        className="p-6 space-y-4 max-w-3xl flex-1"
      >
        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
        {step === 3 && renderStep4()}

        {step < 3 && (
          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (step > 0 ? setStep(step - 1) : navigate('/ptw/permits'))}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canAdvance(step)}
            >
              {step === 2 ? 'Review' : 'Continue'}
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
