import { Button } from '@/components/ui'
import { CheckCircle } from 'lucide-react'
import type { VisitorLog } from '@/lib/visitors'
import { VISITOR_TYPE_LABELS } from '@/lib/visitors'

interface Props {
  log: VisitorLog
  onPrint: () => void
  onReset: () => void
}

export function VisitorSuccess({ log, onPrint, onReset }: Props) {
  const signInTime = new Date(log.signed_in_at).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center">
          <CheckCircle size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-emerald-400">SIGNED IN</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Visitor access granted</p>
      </div>

      <div className="visitor-badge border border-[var(--color-glass-border)] rounded-md p-4 text-center bg-[var(--color-bg-surface)]">
        <p className="text-xs font-bold text-[var(--color-text-muted)] tracking-wider uppercase mb-1">
          Aquerii Site Access
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-3">Visitor Badge</p>
        <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] flex items-center justify-center">
          <span className="text-lg font-bold text-[var(--color-accent-text)]">A</span>
        </div>
        <p className="text-lg font-bold text-[var(--color-text-primary)]">{log.full_name}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{log.company}</p>
        <p className="text-xs text-[var(--color-accent-text)]">{VISITOR_TYPE_LABELS[log.visitor_type]}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Host: {log.host_name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{signInTime}</p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onPrint}
        >
          Print Badge
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onReset}
        >
          Sign In Next Visitor
        </Button>
      </div>
    </div>
  )
}
