import { Card, Button } from '@/components/ui'
import { User, LogOut } from 'lucide-react'
import type { VisitorLog } from '@/lib/visitors'
import { VISITOR_TYPE_LABELS } from '@/lib/visitors'

interface Props {
  log: VisitorLog
  onSignOut: () => void
  onNewVisitor: () => void
}

function formatDuration(signedInAt: string): string {
  const start = new Date(signedInAt)
  const diff = Date.now() - start.getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatTime(signedInAt: string): string {
  return new Date(signedInAt).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VisitorActiveCard({ log, onSignOut, onNewVisitor }: Props) {
  return (
    <Card className="w-full max-w-lg p-6 text-center">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--color-bg-elevated)] border-2 border-[var(--color-accent)] flex items-center justify-center">
          <User size={32} className="text-[var(--color-accent-text)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Currently Signed In</h2>
      </div>

      <div className="space-y-1.5 mb-6 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Name:</span>
          <span className="text-[var(--color-text-primary)] font-medium">{log.full_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Company:</span>
          <span className="text-[var(--color-text-primary)] font-medium">{log.company}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Type:</span>
          <span className="text-[var(--color-text-primary)] font-medium">{VISITOR_TYPE_LABELS[log.visitor_type]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Host:</span>
          <span className="text-[var(--color-text-primary)] font-medium">{log.host_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Signed in:</span>
          <span className="text-[var(--color-text-primary)] font-medium">{formatTime(log.signed_in_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Duration:</span>
          <span className="text-[var(--color-text-primary)] font-medium">{formatDuration(log.signed_in_at)}</span>
        </div>
      </div>

      <Button
        variant="danger"
        size="lg"
        fullWidth
        onClick={onSignOut}
        className="mb-3"
      >
        <LogOut size={16} /> Sign Out
      </Button>

      <button
        type="button"
        onClick={onNewVisitor}
        className="w-full text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        Sign In New Visitor →
      </button>
    </Card>
  )
}
