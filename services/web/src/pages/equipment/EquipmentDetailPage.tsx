import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useEquipment,
  useEquipmentCompliance,
  useEquipmentCertRecords,
  useEquipmentCertTypes,
  useCreateEquipmentCertRecord,
  useVerifyCertRecord,
  useUpdateEquipment,
  useDeleteEquipment,
  type EquipmentComplianceStatus,
  type EquipmentStatus,
  EQUIPMENT_COMPLIANCE_STYLES,
  formatEquipmentComplianceStatus,
  formatEquipmentStatus,
} from '@/lib/equipment'
import { Card, Badge, Button, Input, Modal } from '@/components/ui'
import {
  Wrench, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock, Ban,
  Plus, ShieldCheck, FileCheck, Trash2, Save,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showAddCert, setShowAddCert] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const { data: equipment, isLoading: loadingEq } = useEquipment(id!)
  const { data: compliance, isLoading: loadingComp } = useEquipmentCompliance(id!)
  const { data: certRecords, isLoading: loadingCerts } = useEquipmentCertRecords(id!)
  const { data: certTypes } = useEquipmentCertTypes()
  const createCert = useCreateEquipmentCertRecord()
  const verifyCert = useVerifyCertRecord()
  const updateEq = useUpdateEquipment()
  const deleteEq = useDeleteEquipment()

  const isLoading = loadingEq || loadingComp || loadingCerts

  if (isLoading || !equipment) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="p-6 text-[var(--color-text-muted)] animate-pulse">Loading equipment details...</div>
      </div>
    )
  }

  const certs = certRecords ?? []
  const breakdown = compliance?.breakdown ?? []

  const handleVerify = async (certId: string) => {
    try {
      await verifyCert.mutateAsync({ equipmentId: id!, certId })
      toast.success('Cert record verified')
    } catch {
      toast.error('Failed to verify cert record')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteEq.mutateAsync(id!)
      toast.success('Equipment deleted')
      navigate('/equipment')
    } catch {
      toast.error('Failed to delete equipment')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <button
          onClick={() => navigate('/equipment')}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className={clsx('p-2 rounded-lg border', EQUIPMENT_COMPLIANCE_STYLES[equipment.compliance_status])}>
          <Wrench size={20} />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{equipment.name}</h1>
        <Badge variant={
          equipment.status === 'active' ? 'success' :
          equipment.status === 'inactive' ? 'default' :
          equipment.status === 'out_of_service' ? 'danger' : 'default'
        } size="sm">
          {formatEquipmentStatus(equipment.status)}
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
            <Save size={14} /> Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setShowDelete(true)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Equipment Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Type" value={equipment.equipment_type} />
              <InfoRow label="Registration" value={equipment.registration_number} />
              <InfoRow label="Manufacturer" value={equipment.manufacturer} />
              <InfoRow label="Model" value={equipment.model} />
              <InfoRow label="Year" value={equipment.year?.toString()} />
              <InfoRow label="Site Area" value={equipment.site_area} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Compliance Status</h2>
            {compliance ? (
              <>
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    compliance.overall_status === 'compliant' ? 'bg-emerald-500/10' :
                    compliance.overall_status === 'expiring_soon' ? 'bg-amber-500/10' :
                    compliance.overall_status === 'non_compliant' ? 'bg-red-500/10' : 'bg-zinc-500/10',
                  )}>
                    {compliance.overall_status === 'compliant' ? <CheckCircle2 size={24} className="text-emerald-400" /> :
                     compliance.overall_status === 'expiring_soon' ? <Clock size={24} className="text-amber-400" /> :
                     compliance.overall_status === 'non_compliant' ? <XCircle size={24} className="text-red-400" /> :
                     <Ban size={24} className="text-zinc-400" />}
                  </div>
                  <div>
                    <p className={clsx(
                      'text-lg font-bold',
                      compliance.overall_status === 'compliant' ? 'text-emerald-400' :
                      compliance.overall_status === 'expiring_soon' ? 'text-amber-400' :
                      compliance.overall_status === 'non_compliant' ? 'text-red-400' : 'text-zinc-400',
                    )}>
                      {formatEquipmentComplianceStatus(compliance.overall_status)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {compliance.cert_summary.valid} valid &middot; {compliance.cert_summary.expiring_soon} expiring &middot; {compliance.cert_summary.expired} expired &middot; {compliance.cert_summary.missing} missing
                    </p>
                  </div>
                </div>

                {breakdown.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Cert Breakdown</p>
                    {breakdown.map(cert => (
                      <div key={cert.cert_type_id} className="flex items-center justify-between py-1.5 border-b border-[var(--color-glass-border)] last:border-0">
                        <span className="text-xs text-[var(--color-text-primary)]">{cert.cert_type_name}</span>
                        <Badge
                          size="sm"
                          variant={cert.status === 'valid' ? 'success' : cert.status === 'expiring_soon' ? 'warning' : 'danger'}
                        >
                          {cert.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No compliance data available.</p>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Certification Records</h2>
            <Button size="sm" onClick={() => setShowAddCert(true)}>
              <Plus size={14} /> Add Cert Record
            </Button>
          </div>

          {certs.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck size={28} className="mx-auto text-[var(--color-text-muted)] mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">No certification records.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-glass-border)]">
                    <Th>Type</Th>
                    <Th>Cert #</Th>
                    <Th>Issued</Th>
                    <Th>Expires</Th>
                    <Th>Status</Th>
                    <Th>Verified</Th>
                    <Th className="w-20">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map(cert => (
                    <tr key={cert.id} className="border-b border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                      <Td>{cert.cert_type_name}</Td>
                      <Td><span className="font-mono text-xs">{cert.cert_number}</span></Td>
                      <Td>{cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : <span className="text-[var(--color-text-muted)]">—</span>}</Td>
                      <Td>{cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : <span className="text-[var(--color-text-muted)]">—</span>}</Td>
                      <Td>
                        <Badge
                          size="sm"
                          variant={cert.status === 'valid' ? 'success' : cert.status === 'expiring_soon' ? 'warning' : 'danger'}
                        >
                          {cert.status.replace(/_/g, ' ')}
                        </Badge>
                      </Td>
                      <Td>
                        {cert.verified ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs">
                            <FileCheck size={12} /> Verified
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-muted)] text-xs">Pending</span>
                        )}
                      </Td>
                      <Td>
                        {!cert.verified && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleVerify(cert.id)}
                            loading={verifyCert.isPending}
                          >
                            Verify
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={showAddCert} onClose={() => setShowAddCert(false)} title="Add Cert Record" size="lg">
        <CertRecordForm
          certTypes={certTypes ?? []}
          equipmentId={id!}
          onSubmit={async (data) => {
            try {
              await createCert.mutateAsync({ equipmentId: id!, ...data })
              toast.success('Cert record added')
              setShowAddCert(false)
            } catch {
              toast.error('Failed to add cert record')
            }
          }}
          onCancel={() => setShowAddCert(false)}
          isPending={createCert.isPending}
        />
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Equipment" size="lg">
        <EditEquipmentForm
          equipment={equipment}
          onSubmit={async (data) => {
            try {
              await updateEq.mutateAsync({ id: id!, ...data })
              toast.success('Equipment updated')
              setShowEdit(false)
            } catch {
              toast.error('Failed to update equipment')
            }
          }}
          onCancel={() => setShowEdit(false)}
          isPending={updateEq.isPending}
        />
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Equipment" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Are you sure you want to delete <strong>{equipment.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteEq.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="text-sm text-[var(--color-text-primary)] font-medium">{value ?? <span className="text-[var(--color-text-muted)]">—</span>}</p>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx('px-3 py-2.5 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider', className)}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 text-sm text-[var(--color-text-primary)]">{children}</td>
}

function CertRecordForm({
  certTypes,
  equipmentId,
  onSubmit,
  onCancel,
  isPending,
}: {
  certTypes: { id: string; name: string; description: string | null; required: boolean }[]
  equipmentId: string
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  isPending: boolean
}) {
  const [certTypeId, setCertTypeId] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [issuedAt, setIssuedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certTypeId || !certNumber.trim()) return
    await onSubmit({
      cert_type_id: certTypeId,
      cert_number: certNumber.trim(),
      issued_at: issuedAt || null,
      expires_at: expiresAt || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text-secondary)]">Certification Type *</label>
        <select
          value={certTypeId}
          onChange={(e) => setCertTypeId(e.target.value)}
          className="w-full h-10 rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] border border-[var(--color-glass-border)] px-3 text-sm focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">Select cert type...</option>
          {certTypes.map(ct => (
            <option key={ct.id} value={ct.id}>
              {ct.name}{ct.required ? ' (Required)' : ''}
            </option>
          ))}
        </select>
      </div>
      <Input label="Cert Number *" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="e.g. CERT-2024-001" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Issued At" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
        <Input label="Expires At" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>
      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isPending} disabled={!certTypeId || !certNumber.trim()}>Add Record</Button>
      </div>
    </form>
  )
}

function EditEquipmentForm({
  equipment,
  onSubmit,
  onCancel,
  isPending,
}: {
  equipment: { name: string; equipment_type: string; registration_number: string; manufacturer: string | null; model: string | null; year: number | null; site_area: string | null; status: EquipmentStatus }
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState(equipment.name)
  const [regNo, setRegNo] = useState(equipment.registration_number)
  const [manufacturer, setManufacturer] = useState(equipment.manufacturer ?? '')
  const [model, setModel] = useState(equipment.model ?? '')
  const [year, setYear] = useState(equipment.year?.toString() ?? '')
  const [siteArea, setSiteArea] = useState(equipment.site_area ?? '')
  const [status, setStatus] = useState(equipment.status)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit({
      name: name.trim(),
      registration_number: regNo.trim(),
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      year: year ? parseInt(year, 10) : null,
      site_area: siteArea.trim() || null,
      status,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Registration Number" value={regNo} onChange={(e) => setRegNo(e.target.value)} />
      <div className="grid grid-cols-3 gap-4">
        <Input label="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        <Input label="Model" value={model} onChange={(e) => setModel(e.target.value)} />
        <Input label="Year" value={year} onChange={(e) => setYear(e.target.value)} type="number" />
      </div>
      <Input label="Site Area" value={siteArea} onChange={(e) => setSiteArea(e.target.value)} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text-secondary)]">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
          className="w-full h-10 rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-primary)] border border-[var(--color-glass-border)] px-3 text-sm focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="out_of_service">Out of Service</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isPending} disabled={!name.trim()}>Save</Button>
      </div>
    </form>
  )
}
