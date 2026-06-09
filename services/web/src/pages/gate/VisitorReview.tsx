import { Card, Checkbox, Button } from '@/components/ui'
import type { VisitorType } from '@/lib/visitors'
import { VISITOR_TYPE_LABELS } from '@/lib/visitors'
import type { VisitorFormData } from './VisitorForm'

interface Props {
  type: VisitorType
  data: VisitorFormData
  notifyHost: boolean
  onNotifyChange: (v: boolean) => void
  onEdit: () => void
  onConfirm: () => void
  loading: boolean
}

function formatDate() {
  const now = new Date()
  return now.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VisitorReview({ type, data, notifyHost, onNotifyChange, onEdit, onConfirm, loading }: Props) {
  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: VISITOR_TYPE_LABELS[type] },
    { label: 'Name', value: data.full_name },
    { label: 'Company', value: data.company },
    ...(data.id_number ? [{ label: 'ID Number', value: data.id_number }] : []),
    ...(data.vehicle_reg ? [{ label: 'Vehicle', value: data.vehicle_reg }] : []),
    { label: 'Host', value: data.host_name },
    { label: 'Purpose', value: data.purpose },
    { label: 'Time', value: formatDate() },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          ← Edit
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">Step 3 of 3</span>
      </div>

      <Card variant="default" padding="sm" className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">{row.label}</span>
            <span className="text-[var(--color-text-primary)] font-medium text-right">{row.value}</span>
          </div>
        ))}
      </Card>

      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={notifyHost}
          onChange={(e) => onNotifyChange(e.target.checked)}
          className="mt-0.5"
        />
        <div>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            Notify host via SMS
          </span>
          <p className="text-xs text-[var(--color-text-muted)]">
            Send an SMS to the host notifying them that their visitor has arrived.
          </p>
        </div>
      </label>

      <div className="flex gap-3 pt-2">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onEdit}
          disabled={loading}
        >
          Edit
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onConfirm}
          loading={loading}
        >
          Confirm & Sign In
        </Button>
      </div>
    </div>
  )
}
