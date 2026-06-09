import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  usePermit, useAvailableTransitions, usePermitTransition,
  useAddHazard, useVerifyHazard, useAddIsolation, useDeletePermit,
  PERMIT_STATUS_COLORS, PERMIT_RISK_COLORS,
  formatPermitType, formatPermitStatus, isHighRiskType,
  ENERGY_TYPES, type EnergyType, type ResidualRisk, type Transition,
} from '@/lib/ptw'
import { Card, Badge, Button, Input, Textarea, Select } from '@/components/ui'
import { ArrowLeft, Check, X, AlertTriangle, Lock, Play, Pause, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const TRANSITION_LABELS: Record<Transition, string> = {
  request: 'Submit for approval',
  approve: 'Approve',
  reject: 'Reject',
  issue: 'Issue to holder',
  activate: 'Activate on site',
  suspend: 'Suspend work',
  resume: 'Resume work',
  close: 'Close permit',
}

const TRANSITION_VARIANT: Record<Transition, 'primary' | 'outline' | 'danger'> = {
  request: 'primary',
  approve: 'primary',
  reject: 'danger',
  issue: 'primary',
  activate: 'primary',
  suspend: 'outline',
  resume: 'primary',
  close: 'outline',
}

export default function PermitDetailPage() {
  const { permitId } = useParams<{ permitId: string }>()
  const navigate = useNavigate()
  const { data: permit, isLoading } = usePermit(permitId)
  const { data: transitions = [] } = useAvailableTransitions(permitId)
  const apply = usePermitTransition()
  const addHazard = useAddHazard()
  const verifyHazard = useVerifyHazard()
  const addIsolation = useAddIsolation()
  const del = useDeletePermit()

  if (isLoading || !permit) {
    return <p className="p-6 text-[var(--color-text-muted)] animate-pulse">Loading...</p>
  }

  const isDraft = permit.status === 'draft'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ptw/permits')} className="p-1 hover:bg-zinc-800 rounded">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{permit.reference}</span>
              <Badge className={clsx('text-[10px]', PERMIT_STATUS_COLORS[permit.status])}>
                {formatPermitStatus(permit.status)}
              </Badge>
              <Badge className={clsx('text-[10px]', PERMIT_RISK_COLORS[permit.risk_level])}>
                {permit.risk_level}
              </Badge>
              {isHighRiskType(permit.type) && (
                <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">High risk</Badge>
              )}
            </div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">{permit.title}</h1>
          </div>
        </div>
        {isDraft && (
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm('Delete this draft permit? This cannot be undone.')) return
              await del.mutateAsync(permit.id)
              navigate('/ptw/permits')
            }}
          >
            Delete draft
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 p-6 flex-1">
        <div className="col-span-2 space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Work details</h2>
            <p className="text-sm whitespace-pre-wrap">{permit.description}</p>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div><span className="text-[var(--color-text-muted)]">Type:</span> {formatPermitType(permit.type)}</div>
              <div><span className="text-[var(--color-text-muted)]">Location:</span> {permit.location}</div>
              {permit.equipment_id && (
                <div><span className="text-[var(--color-text-muted)]">Equipment:</span> {permit.equipment_id}</div>
              )}
              {permit.valid_until && (
                <div>
                  <span className="text-[var(--color-text-muted)]">Valid until:</span>{' '}
                  {new Date(permit.valid_until).toLocaleString()}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Method statement & PPE</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">WORK METHOD STATEMENT</p>
            <p className="text-sm whitespace-pre-wrap mb-3">{permit.work_method_statement}</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">PPE REQUIRED</p>
            <p className="text-sm whitespace-pre-wrap">{permit.ppe_required}</p>
            {permit.pre_conditions && permit.pre_conditions.length > 0 && (
              <>
                <p className="text-xs text-[var(--color-text-muted)] mt-3 mb-1">PRE-CONDITIONS</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {permit.pre_conditions.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" /> Hazards
              </h2>
              <AddHazardInline onAdd={async (payload) => {
                await addHazard.mutateAsync({ permitId: permit.id, payload })
                toast.success('Hazard added')
              }} />
            </div>
            {permit.hazards && permit.hazards.length > 0 ? (
              <div className="space-y-2">
                {permit.hazards.map((h) => (
                  <div key={h.id} className="border border-[var(--color-glass-border)] rounded p-2 text-sm">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{h.description}</p>
                      {h.verified ? (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          <Check size={10} /> verified
                        </Badge>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => verifyHazard.mutate({ permitId: permit.id, hazardId: h.id })}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Control: {h.control_measure}</p>
                    <p className="text-xs mt-1">Residual: <strong>{h.residual_risk}</strong></p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">No hazards identified.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Lock size={14} className="text-orange-400" /> Isolations (LOTO)
            </h2>
            <AddIsolationInline
              onAdd={async (payload) => {
                await addIsolation.mutateAsync({ permitId: permit.id, payload })
                toast.success('Isolation applied')
              }}
            />
            {permit.isolations && permit.isolations.length > 0 ? (
              <div className="space-y-1 mt-2">
                {permit.isolations.map((i) => (
                  <div key={i.id} className="border border-[var(--color-glass-border)] rounded p-2 text-xs flex justify-between">
                    <div>
                      <p className="font-medium">{i.isolation_point}</p>
                      <p className="text-[var(--color-text-muted)]">{i.energy_type} • {i.method}</p>
                    </div>
                    <div className="text-right">
                      {i.lock_number && <p>🔒 {i.lock_number}</p>}
                      {i.removed_at && <p className="text-amber-400">Removed {new Date(i.removed_at).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] mt-2">No isolations recorded.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-400" /> Workflow
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">
              {transitions.length === 0
                ? 'No actions available to you for this permit in its current state.'
                : 'Actions available to you:'}
            </p>
            {transitions.length > 0 && (
              <div className="space-y-2">
                {transitions.map((t) => (
                  <TransitionButton
                    key={t}
                    transition={t}
                    onRun={async (payload, reason) => {
                      await apply.mutateAsync({ id: permit.id, action: t, payload })
                      toast.success(`${TRANSITION_LABELS[t]} done`)
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Parties</h2>
            <dl className="text-xs space-y-1">
              <Row label="Issuer" value={permit.issuer?.name} />
              <Row label="Approver" value={permit.approver?.name} />
              <Row label="Holder" value={permit.holder?.name} />
              <Row label="Recipient" value={permit.recipient?.name} />
              <Row label="Closed by" value={permit.closer?.name} />
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Timeline</h2>
            <dl className="text-xs space-y-1">
              <Row label="Requested" value={fmt(permit.requested_at)} />
              <Row label="Approved" value={fmt(permit.approved_at)} />
              <Row label="Issued" value={fmt(permit.issued_at)} />
              <Row label="Activated" value={fmt(permit.activated_at)} />
              <Row label="Suspended" value={fmt(permit.suspended_at)} />
              <Row label="Closed" value={fmt(permit.closed_at)} />
            </dl>
            {permit.rejection_reason && (
              <p className="text-xs text-red-400 mt-2">Rejected: {permit.rejection_reason}</p>
            )}
            {permit.suspension_reason && (
              <p className="text-xs text-amber-400 mt-2">Suspended: {permit.suspension_reason}</p>
            )}
            {permit.closure_notes && (
              <p className="text-xs text-[var(--color-text-muted)] mt-2">Closure: {permit.closure_notes}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function TransitionButton({ transition, onRun }: { transition: Transition; onRun: (payload?: Record<string, unknown>, reason?: string) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState('')
  const [validUntil, setValidUntil] = useState('')

  const needsReason = transition === 'reject' || transition === 'suspend'
  const needsValidity = transition === 'issue'
  const needsNotes = transition === 'close'

  if (showForm) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const payload: Record<string, unknown> = {}
          if (needsValidity && validUntil) payload.valid_until = new Date(validUntil).toISOString()
          if (needsReason || needsNotes) await onRun(payload, reason)
          else await onRun(payload)
        }}
        className="border border-[var(--color-glass-border)] rounded p-2 space-y-2"
      >
        {needsReason && (
          <Textarea
            required
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        )}
        {needsNotes && (
          <Textarea
            required
            placeholder="Closure notes"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        )}
        {needsValidity && (
          <Input
            required
            type="datetime-local"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        )}
        <div className="flex gap-1">
          <Button type="submit" size="xs" variant={TRANSITION_VARIANT[transition]}>
            Confirm
          </Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      </form>
    )
  }

  return (
    <Button
      size="xs"
      variant={TRANSITION_VARIANT[transition]}
      onClick={() => {
        if (needsReason || needsNotes || needsValidity) setShowForm(true)
        else onRun()
      }}
    >
      {TRANSITION_LABELS[transition]}
    </Button>
  )
}

function AddHazardInline({ onAdd }: { onAdd: (p: { description: string; control_measure: string; residual_risk: ResidualRisk }) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState('')
  const [control, setControl] = useState('')
  const [residual, setResidual] = useState<ResidualRisk>('low')

  if (!open) return <Button size="xs" variant="outline" onClick={() => setOpen(true)}>Add hazard</Button>

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await onAdd({ description: desc, control_measure: control, residual_risk: residual })
        setDesc(''); setControl(''); setResidual('low'); setOpen(false)
      }}
      className="border border-[var(--color-glass-border)] rounded p-2 space-y-2"
    >
      <Input required placeholder="Hazard description" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <Input required placeholder="Control measure" value={control} onChange={(e) => setControl(e.target.value)} />
      <Select value={residual} onChange={(e) => setResidual(e.target.value as ResidualRisk)}>
        <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
      </Select>
      <div className="flex gap-1">
        <Button type="submit" size="xs" variant="primary">Add</Button>
        <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}

function AddIsolationInline({ onAdd }: { onAdd: (p: { isolation_point: string; energy_type: EnergyType; method: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [point, setPoint] = useState('')
  const [energy, setEnergy] = useState<EnergyType>('electrical')
  const [method, setMethod] = useState('LOTO')

  if (!open) return <Button size="xs" variant="outline" onClick={() => setOpen(true)}>Add isolation</Button>

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await onAdd({ isolation_point: point, energy_type: energy, method })
        setPoint(''); setMethod('LOTO'); setOpen(false)
      }}
      className="border border-[var(--color-glass-border)] rounded p-2 space-y-2"
    >
      <Input required placeholder="Isolation point (e.g. Conveyor 2 motor)" value={point} onChange={(e) => setPoint(e.target.value)} />
      <Select value={energy} onChange={(e) => setEnergy(e.target.value as EnergyType)}>
        {ENERGY_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
      </Select>
      <Input required placeholder="Method" value={method} onChange={(e) => setMethod(e.target.value)} />
      <div className="flex gap-1">
        <Button type="submit" size="xs" variant="primary">Apply</Button>
        <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right truncate">{value ?? '—'}</dd>
    </div>
  )
}

function fmt(s: string | null | undefined): string {
  return s ? new Date(s).toLocaleString() : '—'
}
