import { Card } from '@/components/ui'
import { User, ClipboardCheck, Truck, Briefcase } from 'lucide-react'
import type { VisitorType } from '@/lib/visitors'

interface Props {
  selected: VisitorType | null
  onSelect: (type: VisitorType) => void
}

const options: { type: VisitorType; label: string; icon: typeof User }[] = [
  { type: 'supplier', label: 'Supplier', icon: Truck },
  { type: 'inspector', label: 'Inspector', icon: ClipboardCheck },
  { type: 'guest', label: 'Guest', icon: User },
  { type: 'job_applicant', label: 'Job Applicant', icon: Briefcase },
]

export function VisitorTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(({ type, label, icon: Icon }) => (
        <Card
          key={type}
          variant="interactive"
          padding="md"
          onClick={() => onSelect(type)}
          className={`flex flex-col items-center gap-2 p-4 text-center ${
            selected === type
              ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
              : ''
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] flex items-center justify-center">
            <Icon size={24} className="text-[var(--color-accent-text)]" />
          </div>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {label}
          </span>
        </Card>
      ))}
    </div>
  )
}
