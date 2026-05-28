import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Search, Plus, Loader2, Mail, Building2, Upload, FileSpreadsheet, Check, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import ContactDrawer from '@/components/crm/ContactDrawer'
import { useContacts, useCreateContact, useImportContacts, useImportStatus, lifecycleColor, scoreColor, CrmContact } from '@/lib/crm'
import { Button, Input, DataTable, type Column } from '@/components/ui'

const LIFECYCLE_STAGES = ['lead', 'qualified', 'opportunity', 'customer', 'churned']

export default function ContactsPage() {
  const workspace = useAuthStore(s => s.workspace)
  const qc        = useQueryClient()
  const wid = workspace?.id

  const [search,         setSearch]         = useState('')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [showNewForm,    setShowNewForm]    = useState(false)
  const [showImport,     setShowImport]     = useState(false)
  const [importId,       setImportId]       = useState<string | null>(null)
  const [newForm,        setNewForm]        = useState({ first_name: '', last_name: '', email: '', phone: '', job_title: '', source: 'manual' })

  const { data: contactsData, isLoading, refetch } = useContacts(wid, search)
  const contacts = contactsData?.data ?? []
  const createContact = useCreateContact(wid)
  const importContacts = useImportContacts(wid)

  const { data: importStatus } = useImportStatus(wid, importId)
  const isImportDone = importStatus?.data?.status === 'completed' || importStatus?.data?.status === 'failed'

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await importContacts.mutateAsync(fd)
      setImportId(res.data.data?.id ?? null)
    } catch {
      toast.error('Import failed to start.')
    }
  }

  const resetImport = () => {
    setImportId(null)
    setShowImport(false)
    qc.invalidateQueries({ queryKey: ['crm', wid, 'contacts'] })
  }

  const columns: Column<CrmContact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent-text)] flex items-center justify-center text-xs font-semibold shrink-0">
            {(c.first_name || c.name)?.[0] ?? '?'}
          </div>
          <div>
            <span className="font-medium text-[var(--color-text-primary)]">{c.first_name} {c.last_name}</span>
            {c.job_title && <p className="text-[10px] text-[var(--color-text-muted)]">{c.job_title}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      hideOnMobile: true,
      render: c => c.email ? (
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]"><Mail size={12} className="text-[var(--color-text-muted)]" />{c.email}</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
    {
      key: 'lifecycle_stage',
      header: 'Stage',
      hideOnMobile: true,
      render: c => (
        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', lifecycleColor(c.lifecycle_stage))}>
          {c.lifecycle_stage}
        </span>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      hideOnMobile: true,
      render: c => c.company ? (
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]"><Building2 size={12} className="text-[var(--color-text-muted)]" />{c.company.name}</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
    {
      key: 'lead_score',
      header: 'Score',
      sortable: true,
      render: c => c.lead_score != null ? (
        <span className={clsx('text-xs font-medium', scoreColor(c.lead_score))}>{c.lead_score}</span>
      ) : <span className="text-[var(--color-text-muted)]">&mdash;</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[var(--color-glass-border)] flex items-center gap-3 shrink-0">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">Contacts</h1>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            containerClassName="!mb-0"
            className="!pl-8 !w-56"
          />
        </div>

        <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
          <Upload size={13} /> Import CSV
        </Button>

        <Button size="sm" onClick={() => setShowNewForm(true)}>
          <Plus size={13} /> New Contact
        </Button>
      </div>

      {showImport && !importId && (
        <div className="px-6 py-3 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
          <div className="border-2 border-dashed border-[var(--color-glass-border)] rounded-xl p-6 text-center">
            <FileSpreadsheet size={28} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">Upload a CSV file with contacts</p>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg text-xs font-medium cursor-pointer transition-colors">
              <Upload size={13} /> Select CSV
              <input type="file" accept=".csv" onChange={handleImportFile} className="hidden" disabled={importContacts.isPending} />
            </label>
            {importContacts.isPending && <Loader2 size={16} className="animate-spin mx-auto mt-2 text-[var(--color-text-muted)]" />}
            <button onClick={() => setShowImport(false)} className="block mx-auto mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
          </div>
        </div>
      )}

      {importId && !isImportDone && (
        <div className="px-6 py-3 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] flex items-center gap-3">
          <Loader2 size={14} className="animate-spin text-[var(--color-accent-text)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            Importing&hellip; {importStatus?.data?.processed_rows ?? 0} / {importStatus?.data?.total_rows ?? '?'} rows
          </span>
        </div>
      )}

      {importId && isImportDone && (
        <div className="px-6 py-3 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] flex items-center gap-3">
          {importStatus?.data?.status === 'completed' ? (
            <Check size={14} className="text-[var(--color-status-done)]" />
          ) : (
            <AlertCircle size={14} className="text-[var(--color-status-blocked)]" />
          )}
          <span className="text-sm text-[var(--color-text-primary)]">
            {importStatus?.data?.status === 'completed'
              ? `Imported ${importStatus.data.processed_rows} contacts.`
              : `Import failed: ${importStatus?.data?.errors?.join(', ') ?? 'unknown error'}`
            }
          </span>
          <button onClick={resetImport} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] ml-auto">Dismiss</button>
        </div>
      )}

      {showNewForm && (
        <div className="px-6 py-3 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] flex items-end gap-3 flex-wrap">
          {(['first_name', 'last_name', 'email', 'phone', 'job_title'] as const).map(f => (
            <div key={f}>
              <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5 capitalize">{f.replace('_', ' ')}</label>
              <Input
                autoFocus={f === 'first_name'}
                value={newForm[f]}
                onChange={e => setNewForm(v => ({ ...v, [f]: e.target.value }))}
                containerClassName="!mb-0"
                className="!w-32"
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">Source</label>
            <select
              value={newForm.source}
              onChange={e => setNewForm(v => ({ ...v, source: e.target.value }))}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] w-28"
            >
              {['manual', 'web_form', 'import', 'api', 'referral'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5">
            <Button
              size="sm"
              onClick={() => {
                if (!newForm.first_name.trim() || !newForm.last_name.trim()) { toast.error('First and last name are required.'); return }
                createContact.mutate(newForm, {
                  onSuccess: () => { setShowNewForm(false); setNewForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', source: 'manual' }) },
                  onError: () => toast.error('Failed to create contact.'),
                })
              }}
              disabled={createContact.isPending}
              loading={createContact.isPending}
            >
              <Plus size={12} /> Create
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowNewForm(false); setNewForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', source: 'manual' }) }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={contacts}
          keyExtractor={c => c.id}
          isLoading={isLoading}
          emptyTitle={search ? 'No contacts match your search.' : 'No contacts yet.'}
          emptyDescription={search ? undefined : 'Add your first one to get started.'}
          onRetry={refetch}
        />
      </div>

      {selectedId && (
        <ContactDrawer
          contactId={selectedId}
          workspaceId={wid!}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
