import { useState } from 'react'
import {
  useIncidents, useCreateIncident, useUpdateIncident,
  INCIDENT_TYPES, INCIDENT_SEVERITIES, INCIDENT_STATUSES,
  SEVERITY_COLORS, formatIncidentType,
  type Incident, type IncidentType, type IncidentSeverity, type IncidentStatus,
} from '@/lib/hsse'
import { Card, Badge, Button, Input, MentionInput, Select, PrintButton, ExportButton } from '@/components/ui'
import { Plus, AlertTriangle, X } from 'lucide-react'
import clsx from 'clsx'

export default function IncidentsPage() {
  const [filters, setFilters] = useState<{ status?: IncidentStatus; severity?: IncidentSeverity; type?: IncidentType }>({})
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Incident | null>(null)
  const { data: incidents, isLoading } = useIncidents(filters)
  const create = useCreateIncident()
  const update = useUpdateIncident()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-400" />
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Incidents</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton entity="incidents" />
          <PrintButton label="Incidents" />
          <Button onClick={() => setShowCreate(true)} variant="primary">
            <Plus size={14} /> Report Incident
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-6 py-3 border-b border-[var(--color-glass-border)]">
        <Select
          value={filters.type ?? ''}
          onChange={(e) => setFilters({ ...filters, type: (e.target.value || undefined) as IncidentType })}
          className="text-xs"
        >
          <option value="">All types</option>
          {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{formatIncidentType(t)}</option>)}
        </Select>
        <Select
          value={filters.severity ?? ''}
          onChange={(e) => setFilters({ ...filters, severity: (e.target.value || undefined) as IncidentSeverity })}
          className="text-xs"
        >
          <option value="">All severities</option>
          {INCIDENT_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select
          value={filters.status ?? ''}
          onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as IncidentStatus })}
          className="text-xs"
        >
          <option value="">All statuses</option>
          {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
      </div>

      {/* List */}
      <div className="flex-1 px-6 py-4">
        {isLoading ? (
          <p className="text-[var(--color-text-muted)] animate-pulse">Loading...</p>
        ) : !incidents || incidents.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertTriangle size={32} className="mx-auto text-zinc-500 mb-2" />
            <p className="text-[var(--color-text-muted)]">No incidents recorded</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => (
              <Card key={inc.id} className="p-4 hover:border-indigo-500/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">{inc.reference}</span>
                      <Badge className={clsx('text-[10px]', SEVERITY_COLORS[inc.severity])}>{inc.severity}</Badge>
                      <Badge className="text-[10px]">{formatIncidentType(inc.type)}</Badge>
                      {inc.mhsa_classification && (
                        <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                          MHSA {inc.mhsa_classification}
                        </Badge>
                      )}
                      {inc.coida_reportable && (
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                          COIDA
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{inc.title}</p>
                    {inc.location && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">📍 {inc.location}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge className="text-[10px]">{inc.status.replace(/_/g, ' ')}</Badge>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                      {new Date(inc.occurred_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => setEditing(inc)}
                      className="text-xs text-indigo-400 hover:underline mt-1"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <IncidentFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            await create.mutateAsync(data)
            setShowCreate(false)
          }}
        />
      )}
      {editing && (
        <IncidentFormModal
          incident={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await update.mutateAsync({ ...data, id: editing.id })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

interface IncidentFormProps {
  incident?: Incident
  onClose: () => void
  onSubmit: (data: Partial<Incident>) => Promise<void>
}

function IncidentFormModal({ incident, onClose, onSubmit }: IncidentFormProps) {
  const [form, setForm] = useState<Partial<Incident>>(incident ?? {
    type: 'near_miss', severity: 'medium', status: 'open',
    title: '', description: '', occurred_at: new Date().toISOString().slice(0, 16),
    location: '', coida_reportable: false,
  })
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {incident ? `Edit ${incident.reference}` : 'Report Incident'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            try {
              await onSubmit({ ...form, mention_user_ids: mentionUserIds } as any)
            } finally {
              setSubmitting(false)
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Title</label>
            <Input
              required
              value={form.title ?? ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief description"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Description</label>
            <MentionInput
              required
              value={form.description ?? ''}
              onChange={(val, ids) => { setForm({ ...form, description: val }); setMentionUserIds(ids) }}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Type</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as IncidentType })}>
                {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{formatIncidentType(t)}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Severity</label>
              <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentSeverity })}>
                {INCIDENT_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Status</label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IncidentStatus })}>
                {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Occurred at</label>
              <Input
                type="datetime-local"
                value={form.occurred_at?.slice(0, 16) ?? ''}
                onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Location</label>
              <Input
                value={form.location ?? ''}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Shaft 1, Plant, etc."
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">MHSA Classification</label>
              <Select
                value={form.mhsa_classification ?? ''}
                onChange={(e) => setForm({ ...form, mhsa_classification: (e.target.value || null) as 'A' | 'B' | 'C' | null })}
              >
                <option value="">None</option>
                <option value="A">A (Fatality)</option>
                <option value="B">B (Serious injury)</option>
                <option value="C">C (Other)</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.coida_reportable ?? false}
                onChange={(e) => setForm({ ...form, coida_reportable: e.target.checked })}
              />
              <span className="text-[var(--color-text-primary)]">COIDA reportable</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : incident ? 'Update' : 'Report'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
