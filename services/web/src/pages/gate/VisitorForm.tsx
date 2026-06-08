import { Input } from '@/components/ui'
import type { VisitorType } from '@/lib/visitors'
import { VISITOR_TYPE_LABELS } from '@/lib/visitors'

export interface VisitorFormData {
  full_name: string
  company: string
  id_number: string
  vehicle_reg: string
  host_name: string
  host_contact: string
  purpose: string
}

interface Props {
  type: VisitorType
  data: VisitorFormData
  onChange: (data: VisitorFormData) => void
  errors: Record<string, string>
  onBack: () => void
  onSubmit: () => void
}

export function VisitorForm({ type, data, onChange, errors, onBack, onSubmit }: Props) {
  const update = (field: keyof VisitorFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, [field]: e.target.value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          ← Back
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">Step 2 of 3</span>
      </div>

      <div className="px-0.5 text-xs text-[var(--color-text-muted)] mb-1">
        Visitor Type: <span className="font-medium text-[var(--color-text-primary)]">{VISITOR_TYPE_LABELS[type]}</span>
      </div>

      <Input
        size="lg"
        label="Full Name *"
        placeholder="e.g. John Smith"
        value={data.full_name}
        onChange={update('full_name')}
        error={errors.full_name}
      />

      <Input
        size="lg"
        label="Company *"
        placeholder="e.g. RBC Mining"
        value={data.company}
        onChange={update('company')}
        error={errors.company}
      />

      <Input
        size="lg"
        label="ID Number / Passport"
        placeholder="e.g. 850101 5800 089 or PA123456"
        value={data.id_number}
        onChange={update('id_number')}
        error={errors.id_number}
      />

      <Input
        size="lg"
        label="Vehicle Registration"
        placeholder="e.g. CF 123-456 GP"
        value={data.vehicle_reg}
        onChange={update('vehicle_reg')}
        error={errors.vehicle_reg}
      />

      <Input
        size="lg"
        label="Host Name *"
        placeholder="e.g. Thabo Mokoena"
        value={data.host_name}
        onChange={update('host_name')}
        error={errors.host_name}
      />

      <Input
        size="lg"
        label="Purpose of Visit *"
        placeholder="e.g. Equipment inspection / delivery"
        value={data.purpose}
        onChange={update('purpose')}
        error={errors.purpose}
      />

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-12 rounded-lg border border-[var(--color-glass-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors text-sm font-medium"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="flex-1 h-12 rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors text-sm font-medium"
        >
          Sign In →
        </button>
      </div>
    </div>
  )
}
