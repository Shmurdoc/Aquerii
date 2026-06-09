import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useEquipmentList,
  useEquipmentCertTypes,
  useCreateEquipment,
  type Equipment,
  type EquipmentStatus,
  type EquipmentComplianceStatus,
  EQUIPMENT_COMPLIANCE_STYLES,
  formatEquipmentComplianceStatus,
  formatEquipmentStatus,
} from '@/lib/equipment'
import { Card, Badge, Input, Select, Button, Modal } from '@/components/ui'
import { Wrench, Plus, Search, CheckCircle2, XCircle, AlertTriangle, Clock, Ban } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const COMPLIANCE_ICONS: Record<EquipmentComplianceStatus, typeof CheckCircle2> = {
  compliant: CheckCircle2,
  expiring_soon: Clock,
  non_compliant: XCircle,
  suspended: Ban,
}

export default function EquipmentListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [complianceFilter, setComplianceFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const { data, isLoading } = useEquipmentList({
    search: search || undefined,
    type: typeFilter || undefined,
    status: (statusFilter as EquipmentStatus) || undefined,
    compliance_status: (complianceFilter as EquipmentComplianceStatus) || undefined,
  })

  const { data: certTypes } = useEquipmentCertTypes()
  const createEquipment = useCreateEquipment()

  const equipmentList = data?.data ?? []

  const allTypes = [...new Set(equipmentList.map(e => e.equipment_type).filter(Boolean))]

  const complianceBadge = (status: EquipmentComplianceStatus) => {
    const Icon = COMPLIANCE_ICONS[status]
    const label = formatEquipmentComplianceStatus(status)
    switch (status) {
      case 'compliant':
        return <Badge variant="success" size="sm" icon={Icon}>{label}</Badge>
      case 'expiring_soon':
        return <Badge variant="warning" size="sm" icon={Icon}>{label}</Badge>
      case 'non_compliant':
        return <Badge variant="danger" size="sm" icon={Icon}>{label}</Badge>
      case 'suspended':
        return <Badge size="sm" icon={Icon}>{label}</Badge>
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)]">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Wrench size={20} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Equipment</h1>
        </div>
        <div className="p-6 text-[var(--color-text-muted)] animate-pulse">Loading equipment...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Wrench size={20} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Equipment</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Equipment
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-glass-border)]">
        <Input
          size="sm"
          icon={Search}
          placeholder="Search by name or registration..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60"
          clearable
          onClear={() => setSearch('')}
        />
        <Select size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
          <option value="">All Types</option>
          {allTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="out_of_service">Out of Service</option>
          <option value="retired">Retired</option>
        </Select>
        <Select size="sm" value={complianceFilter} onChange={(e) => setComplianceFilter(e.target.value)} className="w-40">
          <option value="">All Compliance</option>
          <option value="compliant">Compliant</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="non_compliant">Non-Compliant</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <div className="flex-1 px-6 py-4 space-y-2">
        {equipmentList.length === 0 ? (
          <Card className="p-8 text-center">
            <Wrench size={32} className="mx-auto text-[var(--color-text-muted)] mb-2" />
            <p className="text-[var(--color-text-muted)]">No equipment found.</p>
          </Card>
        ) : (
          equipmentList.map(eq => (
            <Card
              key={eq.id}
              variant="interactive"
              className="p-4 flex items-center gap-4"
              onClick={() => navigate(`/equipment/${eq.id}`)}
            >
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                EQUIPMENT_COMPLIANCE_STYLES[eq.compliance_status],
              )}>
                <Wrench size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{eq.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {eq.equipment_type} &middot; {eq.registration_number}
                  {eq.site_area && <> &middot; {eq.site_area}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={
                  eq.status === 'active' ? 'success' :
                  eq.status === 'inactive' ? 'default' :
                  eq.status === 'out_of_service' ? 'danger' : 'default'
                } size="sm">
                  {formatEquipmentStatus(eq.status)}
                </Badge>
                {complianceBadge(eq.compliance_status)}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Equipment"
        size="lg"
      >
        <EquipmentForm
          certTypes={certTypes ?? []}
          onSubmit={async (data) => {
            try {
              await createEquipment.mutateAsync(data)
              toast.success('Equipment created')
              setShowAddModal(false)
            } catch {
              toast.error('Failed to create equipment')
            }
          }}
          onCancel={() => setShowAddModal(false)}
          isPending={createEquipment.isPending}
        />
      </Modal>
    </div>
  )
}

function EquipmentForm({
  certTypes,
  onSubmit,
  onCancel,
  isPending,
}: {
  certTypes: { id: string; name: string }[]
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState('')
  const [equipmentType, setEquipmentType] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [siteArea, setSiteArea] = useState('')
  const [customType, setCustomType] = useState('')

  const typeOptions = [...new Set([
    ...certTypes.map(c => c.name),
    'Crane', 'Forklift', 'Hoist', 'Pressure Vessel', 'Generator',
    'Compressor', 'Pump', 'Conveyor', 'Elevator', 'Boiler',
  ])]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !registrationNumber.trim()) return
    await onSubmit({
      name: name.trim(),
      equipment_type: equipmentType === '__other__' ? customType.trim() : equipmentType,
      registration_number: registrationNumber.trim(),
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      year: year ? parseInt(year, 10) : null,
      site_area: siteArea.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tower Crane #3" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Equipment Type *</label>
          <select
            value={equipmentType}
            onChange={(e) => setEquipmentType(e.target.value)}
            className="w-full h-10 rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] border border-[var(--color-glass-border)] px-3 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">Select type...</option>
            {typeOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="__other__">Other...</option>
          </select>
        </div>
        {equipmentType === '__other__' && (
          <Input label="Custom Type *" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Enter type" />
        )}
      </div>
      <Input label="Registration Number *" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="e.g. CR-2024-001" />
      <div className="grid grid-cols-3 gap-4">
        <Input label="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g. Liebherr" />
        <Input label="Model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. 100 EC-B 10" />
        <Input label="Year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024" type="number" />
      </div>
      <Input label="Site Area" value={siteArea} onChange={(e) => setSiteArea(e.target.value)} placeholder="e.g. North Yard" />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isPending} disabled={!name.trim() || !registrationNumber.trim()}>Create</Button>
      </div>
    </form>
  )
}
