import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Search, Plus, Loader2, User, Mail, Phone, Building2, Upload, X, FileSpreadsheet, Check, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import ContactDrawer from '@/components/crm/ContactDrawer'
import { useContacts, useCreateContact, useImportContacts, useImportStatus, lifecycleColor, scoreColor, CrmContact } from '@/lib/crm'

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

  const { data: contactsData, isLoading } = useContacts(wid, search)
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3 shrink-0">
        <h1 className="text-sm font-semibold text-white flex-1">Contacts</h1>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
          />
        </div>

        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
        >
          <Upload size={13} /> Import CSV
        </button>

        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus size={13} /> New Contact
        </button>
      </div>

      {/* Import modal */}
      {showImport && !importId && (
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/60">
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center">
            <FileSpreadsheet size={28} className="mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-400 mb-3">Upload a CSV file with contacts</p>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors">
              <Upload size={13} /> Select CSV
              <input type="file" accept=".csv" onChange={handleImportFile} className="hidden" disabled={importContacts.isPending} />
            </label>
            {importContacts.isPending && <Loader2 size={16} className="animate-spin mx-auto mt-2 text-gray-500" />}
            <button onClick={() => setShowImport(false)} className="block mx-auto mt-2 text-xs text-gray-500 hover:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Import progress */}
      {importId && !isImportDone && (
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/60 flex items-center gap-3">
          <Loader2 size={14} className="animate-spin text-indigo-400" />
          <span className="text-sm text-gray-400">
            Importing… {importStatus?.data?.processed_rows ?? 0} / {importStatus?.data?.total_rows ?? '?'} rows
          </span>
        </div>
      )}

      {importId && isImportDone && (
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/60 flex items-center gap-3">
          {importStatus?.data?.status === 'completed' ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <AlertCircle size={14} className="text-red-400" />
          )}
          <span className="text-sm text-gray-300">
            {importStatus?.data?.status === 'completed'
              ? `Imported ${importStatus.data.processed_rows} contacts.`
              : `Import failed: ${importStatus?.data?.errors?.join(', ') ?? 'unknown error'}`
            }
          </span>
          <button onClick={resetImport} className="text-xs text-gray-500 hover:text-gray-300 ml-auto">Dismiss</button>
        </div>
      )}

      {/* New contact form */}
      {showNewForm && (
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/60 flex items-end gap-3 flex-wrap">
          {(['first_name', 'last_name', 'email', 'phone', 'job_title'] as const).map(f => (
            <div key={f}>
              <label className="text-[10px] text-gray-500 block mb-0.5 capitalize">{f.replace('_', ' ')}</label>
              <input
                autoFocus={f === 'first_name'}
                value={newForm[f]}
                onChange={e => setNewForm(v => ({ ...v, [f]: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Source</label>
            <select
              value={newForm.source}
              onChange={e => setNewForm(v => ({ ...v, source: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
            >
              {['manual', 'web_form', 'import', 'api', 'referral'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={() => {
                if (!newForm.first_name.trim() || !newForm.last_name.trim()) { toast.error('First and last name are required.'); return }
                createContact.mutate(newForm, {
                  onSuccess: () => { setShowNewForm(false); setNewForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', source: 'manual' }) },
                  onError: () => toast.error('Failed to create contact.'),
                })
              }}
              disabled={createContact.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors"
            >
              {createContact.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Create
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', source: 'manual' }) }}
              className="px-3 py-1.5 text-gray-400 hover:text-gray-200 text-xs rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-600">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-3">
            <User size={32} className="text-gray-700" />
            <p className="text-sm">{search ? 'No contacts match your search.' : 'No contacts yet. Add your first one.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Stage</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Company</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {contacts.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={clsx(
                    'cursor-pointer hover:bg-gray-900/50 transition-colors',
                    selectedId === c.id && 'bg-indigo-900/10'
                  )}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center text-xs font-semibold shrink-0">
                        {(c.first_name || c.name)?.[0] ?? '?'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-100">{c.first_name} {c.last_name}</span>
                        {c.job_title && <p className="text-[10px] text-gray-500">{c.job_title}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {c.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail size={12} className="text-gray-600" />
                        {c.email}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', lifecycleColor(c.lifecycle_stage))}>
                      {c.lifecycle_stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                    {c.company ? (
                      <span className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-600" />
                        {c.company.name}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.lead_score != null ? (
                      <span className={clsx('text-xs font-medium', scoreColor(c.lead_score))}>{c.lead_score}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
