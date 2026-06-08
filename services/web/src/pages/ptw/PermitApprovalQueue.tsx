import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  usePermits, usePermitTransition,
  PERMIT_STATUS_COLORS, PERMIT_RISK_COLORS,
  formatPermitType, formatPermitStatus, isHighRiskType,
  type Permit, type Transition,
} from '@/lib/ptw'
import { usePermit } from '@/lib/ptw'
import { Card, Badge, Button, Input, Textarea, Modal } from '@/components/ui'
import { ClipboardCheck, AlertTriangle, Check, X, Clock, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '<1h'
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function isUrgent(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 4 * 3600000
}

export default function PermitApprovalQueue() {
  const navigate = useNavigate()
  const { data: permits, isLoading } = usePermits({ status: 'requested' })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const submitted = useMemo(() => (permits ?? []).filter(p => p.status === 'requested'), [permits])

  if (selectedId) {
    return (
      <PermitApprovalDetail
        permitId={selectedId}
        onBack={() => setSelectedId(null)}
        onApproved={() => { setSelectedId(null); toast.success('Permit approved') }}
        onRejected={() => { setSelectedId(null); toast.success('Permit rejected') }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <ClipboardCheck size={20} className="text-indigo-400" />
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Permit Approval Queue</h1>
        <Badge variant="warning" size="sm" className="ml-2">{submitted.length} pending</Badge>
      </div>

      <div className="flex-1 px-6 py-4">
        {isLoading ? (
          <p className="text-[var(--color-text-muted)] animate-pulse">Loading...</p>
        ) : submitted.length === 0 ? (
          <Card className="p-8 text-center">
            <ClipboardCheck size={32} className="mx-auto text-[var(--color-text-muted)] mb-2" />
            <p className="text-[var(--color-text-muted)]">No permits awaiting approval.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {submitted.map(p => {
              const urgent = isUrgent(p.created_at)
              return (
                <Card
                  key={p.id}
                  className={clsx(
                    'p-4 transition-all cursor-pointer hover:border-indigo-500/30',
                    urgent && 'border-red-500/30',
                  )}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">{p.reference}</span>
                      <Badge className={clsx('text-[10px]', PERMIT_STATUS_COLORS[p.status])}>
                        {formatPermitStatus(p.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {urgent && (
                        <Badge size="sm" variant="danger" className="animate-pulse">
                          <Clock size={10} /> Urgent
                        </Badge>
                      )}
                      <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate mb-1">
                    {formatPermitType(p.type)} — {p.location}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Submitted {timeSince(p.created_at)} ago
                  </p>
                  {p.issuer && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      By: {p.issuer.name}
                    </p>
                  )}
                  {isHighRiskType(p.type) && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-red-400">
                      <AlertTriangle size={10} /> High risk
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PermitApprovalDetail({ permitId, onBack, onApproved, onRejected }: { permitId: string; onBack: () => void; onApproved: () => void; onRejected: () => void }) {
  const { data: permit, isLoading } = usePermit(permitId)
  const transition = usePermitTransition()
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    message: string
    onConfirm: () => void
    variant: 'primary' | 'danger'
  } | null>(null)

  if (isLoading || !permit) {
    return <p className="p-6 text-[var(--color-text-muted)] animate-pulse">Loading...</p>
  }

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await transition.mutateAsync({ id: permit.id, action: 'approve' as Transition })
      onApproved()
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setActionLoading(true)
    try {
      await transition.mutateAsync({ id: permit.id, action: 'reject' as Transition, payload: { reason: rejectReason } })
      onRejected()
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <button onClick={onBack} className="p-1 hover:bg-[var(--color-bg-hover)] rounded">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--color-text-muted)]">{permit.reference}</span>
          <Badge className={clsx('text-[10px]', PERMIT_STATUS_COLORS[permit.status])}>
            {formatPermitStatus(permit.status)}
          </Badge>
          <Badge className={clsx('text-[10px]', PERMIT_RISK_COLORS[permit.risk_level])}>
            {permit.risk_level}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 flex-1">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">{formatPermitType(permit.type)} — {permit.title}</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-[var(--color-text-muted)]">Location:</span> {permit.location}</div>
              <div><span className="text-[var(--color-text-muted)]">Equipment:</span> {permit.equipment_id ?? 'N/A'}</div>
              <div><span className="text-[var(--color-text-muted)]">Issuer:</span> {permit.issuer?.name ?? '—'}</div>
              <div><span className="text-[var(--color-text-muted)]">Requested:</span> {permit.requested_at ? new Date(permit.requested_at).toLocaleString() : '—'}</div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm whitespace-pre-wrap">{permit.description}</p>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" /> Hazards & Controls
            </h2>
            {permit.hazards && permit.hazards.length > 0 ? (
              <div className="space-y-2">
                {permit.hazards.map(h => (
                  <div key={h.id} className="border border-[var(--color-glass-border)] rounded p-3 text-sm">
                    <p className="font-medium">{h.description}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Control: {h.control_measure}</p>
                    <p className="text-xs mt-1">Residual risk: <strong>{h.residual_risk}</strong></p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">No hazards recorded.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-400" /> Decision
            </h2>
            {!showRejectForm ? (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setConfirmAction({
                    title: 'Approve Permit',
                    message: 'Are you sure you want to approve this permit?',
                    onConfirm: handleApprove,
                    variant: 'primary',
                  })}
                  loading={actionLoading}
                >
                  <Check size={14} /> Approve
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setShowRejectForm(true)}
                >
                  <X size={14} /> Reject
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-text-muted)]">Rejection reason (required):</p>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this permit is being rejected..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmAction({
                      title: 'Reject Permit',
                      message: 'Are you sure you want to reject this permit? This action cannot be undone.',
                      onConfirm: handleReject,
                      variant: 'danger',
                    })}
                    disabled={!rejectReason.trim()}
                    loading={actionLoading}
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Parties</h2>
            <dl className="text-xs space-y-1">
              <Row label="Issuer" value={permit.issuer?.name} />
              <Row label="Approver" value={permit.approver?.name} />
              <Row label="Holder" value={permit.holder?.name} />
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title}
        description={confirmAction?.message}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant={confirmAction?.variant ?? 'primary'}
              onClick={() => {
                confirmAction?.onConfirm()
                setConfirmAction(null)
              }}
            >
              Confirm
            </Button>
          </>
        }
      />
    </div>
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
