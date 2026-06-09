import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  fetchPortalSummary,
  fetchContractorWorkers,
  fetchPortalHeatmap,
  downloadPortalPdf,
  PortalTokenError,
  type PortalSummary,
  type PortalContractor,
  type PortalWorker,
  type PortalHeatmap,
} from '@/lib/portal'
import { Card, Badge, Button } from '@/components/ui'
import { Building2, Users, Shield, AlertTriangle, Download, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

function getComplianceColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-400'
  if (rate >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function getComplianceBg(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500/10 border-emerald-500/30'
  if (rate >= 60) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-red-500/10 border-red-500/30'
}

function getWorkerStatusColor(status: string): string {
  switch (status) {
    case 'compliant': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 'expiring': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'non_compliant': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
  }
}

function getCertStatusColor(status: string): { bg: string; dot: string } {
  switch (status) {
    case 'valid':
    case 'current': return { bg: 'bg-emerald-500/20', dot: 'bg-emerald-500' }
    case 'expiring_soon':
    case 'expiring': return { bg: 'bg-amber-500/20', dot: 'bg-amber-500' }
    case 'expired': return { bg: 'bg-red-500/20', dot: 'bg-red-500' }
    default: return { bg: 'bg-zinc-500/20', dot: 'bg-zinc-500' }
  }
}

export default function PortalPage() {
  const { token } = useParams<{ token: string }>()

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-deepest)]">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Invalid Portal Link</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            This portal link is invalid. Please request a new one from your account manager.
          </p>
        </Card>
      </div>
    )
  }

  return <PortalDashboard token={token} />
}

function PortalDashboard({ token }: { token: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedData, setExpandedData] = useState<Record<string, PortalWorker[]>>({})
  const [loadingWorkers, setLoadingWorkers] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['portal-summary', token],
    queryFn: () => fetchPortalSummary(token),
    retry: false,
  })

  const { data: heatmap } = useQuery({
    queryKey: ['portal-heatmap', token],
    queryFn: () => fetchPortalHeatmap(token),
    retry: false,
  })

  const handleToggleWorkers = async (contractorId: string) => {
    if (expandedId === contractorId) {
      setExpandedId(null)
      return
    }
    setExpandedId(contractorId)
    if (!expandedData[contractorId]) {
      setLoadingWorkers(contractorId)
      try {
        const workers = await fetchContractorWorkers(token, contractorId)
        setExpandedData(prev => ({ ...prev, [contractorId]: workers }))
      } catch {
        toast.error('Failed to load workers')
      } finally {
        setLoadingWorkers(null)
      }
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await downloadPortalPdf(token)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const name = summary?.workspace_name?.replace(/\s+/g, '-').toLowerCase() ?? 'compliance'
      link.setAttribute('download', `compliance-report-${name}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Compliance report downloaded')
    } catch {
      toast.error('Failed to export compliance report')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
        <div className="h-8 w-72 bg-gray-800/50 rounded" />
        <div className="h-6 w-48 bg-gray-800/50 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-800/50 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-800/50 rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    if (error instanceof PortalTokenError) {
      if (error.expired) {
        const expiredDate = error.expiredAt
          ? new Date(error.expiredAt).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : null
        return (
          <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
            <Card className="p-8 max-w-md text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Portal Link Expired</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-2">
                This portal link expired{expiredDate ? ` on ${expiredDate}` : ''}.
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Contact your Aquerii account manager for a new link.
              </p>
            </Card>
          </div>
        )
      }
      return (
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Invalid Portal Link</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              This portal link is invalid or has expired. Please request a new one from your account manager.
            </p>
          </Card>
        </div>
      )
    }
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <XCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Something Went Wrong</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            An unexpected error occurred. Please try again or contact support.
          </p>
        </Card>
      </div>
    )
  }

  if (!summary || summary.contractors.length === 0) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-500/10 border border-zinc-500/30 flex items-center justify-center">
            <Building2 size={32} className="text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No Contractors Found</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            No contractors found for this workspace.
          </p>
        </Card>
      </div>
    )
  }

  const { contractors, workspace_name, generated_at } = summary
  const generatedDate = generated_at
    ? new Date(generated_at).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Contractor Compliance Portal
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {workspace_name}
            {generatedDate && <span className="text-[var(--color-text-muted)]"> &middot; {generatedDate}</span>}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleExport}
          loading={exporting}
        >
          <Download size={14} />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Contractors"
          value={summary.total_contractors}
          icon={Building2}
          color="text-blue-400"
        />
        <SummaryCard
          label="Total Workers"
          value={summary.total_workers}
          icon={Users}
          color="text-indigo-400"
        />
        <SummaryCard
          label="Compliance Rate"
          value={`${Math.round(summary.overall_compliance_rate)}%`}
          icon={Shield}
          color={getComplianceColor(summary.overall_compliance_rate)}
        />
        <SummaryCard
          label="Equipment Compliance"
          value={`${Math.round(summary.equipment_compliance_rate)}%`}
          icon={Shield}
          color={getComplianceColor(summary.equipment_compliance_rate)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contractors.map((contractor, i) => (
          <ContractorCard
            key={contractor.id}
            contractor={contractor}
            expanded={expandedId === contractor.id}
            workers={expandedData[contractor.id]}
            loadingWorkers={loadingWorkers === contractor.id}
            onToggle={() => handleToggleWorkers(contractor.id)}
            style={{ '--stagger-i': i } as React.CSSProperties}
          />
        ))}
      </div>

      {heatmap && heatmap.rows.length > 0 && (
        <HeatmapSection data={heatmap} />
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <p className={clsx('text-2xl font-bold tabular-nums', color)}>{value}</p>
    </Card>
  )
}

function ContractorCard({
  contractor,
  expanded,
  workers,
  loadingWorkers,
  onToggle,
  style,
}: {
  contractor: PortalContractor
  expanded: boolean
  workers?: PortalWorker[]
  loadingWorkers: boolean
  onToggle: () => void
  style?: React.CSSProperties
}) {
  const {
    company_name,
    compliance_rate,
    total_workers,
    compliant_workers,
    total_equipment,
    compliant_equipment,
    expiring_certs_count,
  } = contractor

  return (
    <div className="stagger-item" style={style}>
      <Card
        variant={expanded ? 'elevated' : 'default'}
        className={clsx(
          'flex flex-col',
          expanded && 'border-[var(--color-accent)]',
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border',
              getComplianceBg(compliance_rate),
            )}>
              <Building2 size={18} className={getComplianceColor(compliance_rate)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{company_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={clsx('text-xs font-semibold tabular-nums', getComplianceColor(compliance_rate))}>
                  {Math.round(compliance_rate)}%
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">compliance</span>
              </div>
            </div>
          </div>
          {expiring_certs_count > 0 && (
            <Badge variant="warning" size="sm" className="shrink-0">
              <AlertTriangle size={10} />
              {expiring_certs_count}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[var(--color-bg-hover)] rounded-md p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              <Users size={10} />
              Workers
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">
              {compliant_workers}<span className="text-[var(--color-text-muted)] font-normal">/{total_workers}</span>
            </p>
            <p className="text-[10px] text-emerald-400 mt-0.5">{compliant_workers} compliant</p>
          </div>
          <div className="bg-[var(--color-bg-hover)] rounded-md p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              <Shield size={10} />
              Equipment
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">
              {compliant_equipment}<span className="text-[var(--color-text-muted)] font-normal">/{total_equipment}</span>
            </p>
            <p className="text-[10px] text-emerald-400 mt-0.5">{compliant_equipment} compliant</p>
          </div>
        </div>

        <button
          onClick={onToggle}
          className={clsx(
            'flex items-center justify-center gap-1.5 w-full py-2 rounded-md text-xs font-medium transition-colors',
            expanded
              ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
              : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-active)]',
          )}
        >
          {loadingWorkers ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            <>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {expanded ? 'Hide Workers' : 'View Workers'}
              {total_workers > 0 && (
                <span className="text-[var(--color-text-muted)]">({total_workers})</span>
              )}
            </>
          )}
        </button>

        {expanded && workers && (
          <div className="mt-3 pt-3 border-t border-[var(--color-glass-border)] space-y-2 animate-fade-in">
            {workers.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-2">No workers found.</p>
            ) : (
              workers.map(worker => (
                <div key={worker.id} className="bg-[var(--color-bg-hover)] rounded-md p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{worker.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{worker.badge_id ?? 'No badge'}{worker.role ? ` • ${worker.role}` : ''}</p>
                    </div>
                    <span className={clsx(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium border',
                      getWorkerStatusColor(worker.overall_status),
                    )}>
                      {worker.overall_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {worker.certifications.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {worker.certifications.map(cert => {
                        const { bg, dot } = getCertStatusColor(cert.status)
                        return (
                          <div key={cert.id} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
                              <span className="text-[var(--color-text-secondary)] truncate">{cert.name}</span>
                            </div>
                            {cert.expires_at && (
                              <span className="text-[var(--color-text-muted)] shrink-0 ml-2">
                                {new Date(cert.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function HeatmapSection({ data }: { data: PortalHeatmap }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
        Certificate Expiry Heatmap
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-glass-border)]">
              <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                Contractor
              </th>
              {data.cert_types.map(cert => (
                <th key={cert} className="py-2 px-2 text-xs font-medium text-[var(--color-text-muted)] text-center whitespace-nowrap min-w-[80px]">
                  {cert}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map(row => (
              <tr key={row.contractor_id} className="border-b border-[var(--color-glass-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors">
                <td className="py-2.5 pr-4 text-sm font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                  {row.contractor_name}
                </td>
                {data.cert_types.map(cert => {
                  const cell = row.cells.find(c => c.cert_name === cert)
                  const colorClass = cell?.status === 'current'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : cell?.status === 'expiring'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  return (
                    <td key={cert} className="py-2.5 px-2 text-center">
                      <span className={clsx(
                        'inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold border tabular-nums',
                        colorClass,
                      )}>
                        {cell?.count ?? 0}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Expiring &le;30d
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Expired
        </span>
      </div>
    </Card>
  )
}
