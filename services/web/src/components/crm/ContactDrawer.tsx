import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  X, Mail, Phone, Building2, Tag, DollarSign,
  Pencil, Check, Loader2, Trash2, Plus, UserPlus, UserMinus,
  History, GitBranch, Shield, Link, ExternalLink, Search,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import {
  useContact, useUpdateContact, useDeleteContact, useTransitionContact,
  useDuplicateContacts, useMergeContacts, useTouchContact,
  useAddRelationship, useRemoveRelationship,
  useConsent, useUpdateConsent, useExportConsent,
  lifecycleColor, CrmContact, CrmContactRelationship, CrmStageTransition,
} from '@/lib/crm'

type Tab = 'details' | 'relationships' | 'history' | 'deals' | 'consent'

const TABS: { key: Tab; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'history', label: 'History' },
  { key: 'deals', label: 'Deals' },
  { key: 'consent', label: 'Consent' },
]

const RELATIONSHIP_TYPES = ['reports_to', 'decision_maker', 'colleague', 'spouse', 'other']
const LIFECYCLE_STAGES = ['lead', 'qualified', 'opportunity', 'customer', 'churned']

interface Props {
  contactId: string
  workspaceId: string
  onClose: () => void
  onDeleted: () => void
}

export default function ContactDrawer({ contactId, workspaceId, onClose, onDeleted }: Props) {
  const qc = useQueryClient()
  const wid = workspaceId
  const [tab, setTab] = useState<Tab>('details')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const { data: contactRes, isLoading } = useContact(wid, contactId)
  const contact = contactRes?.data
  const updateContact = useUpdateContact(wid, contactId)
  const deleteContact = useDeleteContact(wid, contactId)
  const transitionContact = useTransitionContact(wid, contactId)
  const touchContact = useTouchContact(wid, contactId)

  const { data: duplicatesRes } = useDuplicateContacts(wid, contactId)
  const duplicates = duplicatesRes?.data ?? []
  const mergeContacts = useMergeContacts(wid)

  const addRelationship = useAddRelationship(wid)
  const removeRelationship = useRemoveRelationship(wid)

  const { data: consentRes } = useConsent(wid, contactId)
  const updateConsent = useUpdateConsent(wid, contactId)
  const exportConsent = useExportConsent(wid, contactId)

  const [relSearch, setRelSearch] = useState('')
  const [relContactId, setRelContactId] = useState('')
  const [relType, setRelType] = useState('colleague')
  const [transitionStage, setTransitionStage] = useState('')

  const [localConsent, setLocalConsent] = useState({ gdpr: false, marketing: false })

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name ?? '',
        last_name: contact.last_name ?? '',
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        job_title: contact.job_title ?? '',
        source: contact.source ?? 'manual',
        source_url: contact.source_url ?? '',
        notes: (contact as any).notes ?? '',
      })
    }
  }, [contact])

  useEffect(() => {
    if (consentRes?.data) {
      setLocalConsent({ gdpr: consentRes.data.consent_gdpr, marketing: consentRes.data.consent_marketing })
    }
  }, [consentRes])

  const scoreColor = (s: number) =>
    s >= 70 ? 'bg-green-500/20 text-green-400' :
    s >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'

  const handleMerge = (sourceId: string) => {
    mergeContacts.mutate({ source_id: sourceId, target_id: contactId }, {
      onSuccess: () => { toast.success('Merged'); qc.invalidateQueries({ queryKey: ['crm', wid, 'contact', contactId] }) },
      onError: () => toast.error('Merge failed.'),
    })
  }

  const handleExportConsent = () => {
    exportConsent.mutate(undefined, {
      onSuccess: (res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url; a.download = `consent-${contactId}.json`; a.click()
        window.URL.revokeObjectURL(url)
      },
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="w-96 h-full bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          {isLoading ? (
            <div className="h-5 w-32 bg-gray-800 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-sm font-semibold shrink-0">
                {contact?.first_name?.[0] ?? '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-100">{contact?.first_name} {contact?.last_name}</p>
                {contact?.company && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Building2 size={10} /> {contact.company.name}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => touchContact.mutate()}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-200 transition-colors"
              title="Touch contact"
            >
              <ExternalLink size={14} />
            </button>
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-200 transition-colors" title="Edit">
                <Pencil size={14} />
              </button>
            )}
            <button
              onClick={() => { if (confirm(`Delete ${contact?.first_name}? This cannot be undone.`)) deleteContact.mutate(undefined, { onSuccess: onDeleted }) }}
              disabled={deleteContact.isPending}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Delete"
            >
              {deleteContact.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-200 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-3 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                tab === t.key
                  ? 'text-indigo-400 border-indigo-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />)}</div>
          ) : tab === 'details' && !editing ? (
            <>
              <div className="space-y-2">
                {contact?.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-indigo-300"><Mail size={14} className="text-gray-500 shrink-0" />{contact.email}</a>}
                {contact?.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-indigo-300"><Phone size={14} className="text-gray-500 shrink-0" />{contact.phone}</a>}
                {contact?.job_title && <p className="flex items-center gap-2.5 text-sm text-gray-300"><UserPlus size={14} className="text-gray-500 shrink-0" />{contact.job_title}</p>}
              </div>

              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Lifecycle Stage</p>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded', lifecycleColor(contact?.lifecycle_stage ?? 'lead'))}>
                  {contact?.lifecycle_stage}
                </span>
              </div>

              {contact?.lead_score != null && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Lead Score</p>
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded', scoreColor(contact.lead_score))}>{contact.lead_score}/100</span>
                </div>
              )}

              {contact?.social_links && Object.keys(contact.social_links).length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Link size={10} /> Social</p>
                  <div className="space-y-1">
                    {Object.entries(contact.social_links).map(([k, v]) => (
                      <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300">
                        {k} <ExternalLink size={10} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {contact?.tags && contact.tags.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Tag size={10} /> Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map(tag => (
                      <span key={tag} className="bg-indigo-600/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {(contact as any)?.notes && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{(contact as any).notes}</p>
                </div>
              )}

              <div className="text-[10px] text-gray-600 space-y-0.5 pt-2 border-t border-gray-800">
                <p>Source: {contact?.source}</p>
                {contact?.source_url && <p className="truncate">URL: {contact.source_url}</p>}
                {contact?.last_touched_at && <p>Last touched: {new Date(contact.last_touched_at).toLocaleDateString()}</p>}
              </div>

              {duplicates.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-400 mb-2">{duplicates.length} duplicate(s) found</p>
                  <div className="space-y-1">
                    {duplicates.map(d => (
                      <div key={d.id} className="flex items-center justify-between text-xs text-gray-300">
                        <span>{d.first_name} {d.last_name}</span>
                        <button onClick={() => handleMerge(d.id)} disabled={mergeContacts.isPending}
                          className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
                        >Merge</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick transition */}
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Change Stage</p>
                <div className="flex flex-wrap gap-1">
                  {LIFECYCLE_STAGES.map(s => (
                    <button
                      key={s}
                      onClick={() => transitionContact.mutate({ to_stage: s }, { onError: () => toast.error('Invalid transition.') })}
                      disabled={s === contact?.lifecycle_stage || transitionContact.isPending}
                      className={clsx(
                        'text-[10px] px-2 py-0.5 rounded-full transition-colors',
                        s === contact?.lifecycle_stage
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : tab === 'details' && editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(['first_name', 'last_name'] as const).map(f => (
                  <div key={f}>
                    <label className="text-xs text-gray-500 mb-1 block capitalize">{f.replace('_', ' ')}</label>
                    <input value={form[f] ?? ''} onChange={e => setForm(v => ({ ...v, [f]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
              {(['email', 'phone', 'job_title', 'source', 'source_url'] as const).map(f => (
                <div key={f}>
                  <label className="text-xs text-gray-500 mb-1 block capitalize">{f.replace('_', ' ')}</label>
                  <input value={form[f] ?? ''} onChange={e => setForm(v => ({ ...v, [f]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea value={form.notes ?? ''} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => updateContact.mutate(form, { onSuccess: () => setEditing(false) })}
                  disabled={updateContact.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors">
                  {updateContact.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-gray-400 hover:text-gray-200 text-xs rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
              </div>
            </div>
          ) : tab === 'relationships' ? (
            <>
              <div className="space-y-2">
                {contact?.relationships?.map((rel: CrmContactRelationship) => (
                  <div key={rel.id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                    <UserPlus size={14} className="text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{rel.related_contact?.name ?? 'Unknown'}</p>
                      <p className="text-[10px] text-gray-500">{rel.relationship_type}</p>
                    </div>
                    <button onClick={() => removeRelationship.mutate({ contact_id: contactId, relationship_id: rel.id }, { onSuccess: () => toast.success('Removed'), onError: () => toast.error('Failed') })}
                      className="text-gray-600 hover:text-red-400"><UserMinus size={12} /></button>
                  </div>
                ))}
                {(!contact?.relationships || contact.relationships.length === 0) && (
                  <p className="text-xs text-gray-600">No relationships yet.</p>
                )}
              </div>
              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs font-medium text-gray-400 mb-2">Add Relationship</p>
                <div className="space-y-2">
                  <input value={relSearch} onChange={e => setRelSearch(e.target.value)} placeholder="Search contacts…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  <select value={relType} onChange={e => setRelType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                  <button onClick={() => {
                    if (!relContactId) { toast.error('Select a contact first.'); return }
                    addRelationship.mutate({ contact_id: contactId, related_contact_id: relContactId, relationship_type: relType }, {
                      onSuccess: () => { setRelSearch(''); setRelContactId(''); toast.success('Relationship added.') },
                      onError: () => toast.error('Failed.'),
                    })
                  }} disabled={!relContactId}
                    className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors">
                    Add
                  </button>
                </div>
              </div>
            </>
          ) : tab === 'history' ? (
            <div className="space-y-2">
              {contact?.stage_history?.map((h: CrmStageTransition) => (
                <div key={h.id} className="flex items-start gap-2 border-l-2 border-gray-700 pl-3 pb-3">
                  <GitBranch size={12} className="text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-300">
                      {h.from_stage ?? '—'} <span className="text-gray-600">→</span> <span className={clsx('font-medium', lifecycleColor(h.to_stage))}>{h.to_stage}</span>
                    </p>
                    {h.reason && <p className="text-[10px] text-gray-500">{h.reason}</p>}
                    <p className="text-[10px] text-gray-600">{new Date(h.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {(!contact?.stage_history || contact.stage_history.length === 0) && (
                <p className="text-xs text-gray-600">No stage history yet.</p>
              )}
            </div>
          ) : tab === 'deals' ? (
            <div className="space-y-1.5">
              {contact?.deals && contact.deals.length > 0 ? contact.deals.map(deal => (
                <div key={deal.id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: deal.stage?.color ?? '#6366f1' }} />
                  <span className="text-sm text-gray-200 flex-1 truncate">{deal.title}</span>
                  {deal.value != null && <span className="text-xs text-gray-400 shrink-0">${deal.value.toLocaleString()}</span>}
                </div>
              )) : (
                <p className="text-xs text-gray-600">No deals linked.</p>
              )}
            </div>
          ) : tab === 'consent' ? (
            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-300">GDPR Consent</span>
                  <button
                    onClick={() => {
                      const next = !localConsent.gdpr
                      updateConsent.mutate({ consent_gdpr: next }, { onSuccess: () => setLocalConsent(v => ({ ...v, gdpr: next })) })
                    }}
                    className={clsx(
                      'w-10 h-5 rounded-full transition-colors relative',
                      localConsent.gdpr ? 'bg-green-600' : 'bg-gray-700'
                    )}
                  >
                    <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', localConsent.gdpr ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </label>
                <label className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-300">Marketing Consent</span>
                  <button
                    onClick={() => {
                      const next = !localConsent.marketing
                      updateConsent.mutate({ consent_marketing: next }, { onSuccess: () => setLocalConsent(v => ({ ...v, marketing: next })) })
                    }}
                    className={clsx(
                      'w-10 h-5 rounded-full transition-colors relative',
                      localConsent.marketing ? 'bg-green-600' : 'bg-gray-700'
                    )}
                  >
                    <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', localConsent.marketing ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </label>
              </div>
              {consentRes?.data?.consent_preferences && Object.keys(consentRes.data.consent_preferences).length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Preferences</p>
                  {Object.entries(consentRes.data.consent_preferences).map(([k, v]) => (
                    <p key={k} className="text-xs text-gray-400">{k}: {v ? 'Yes' : 'No'}</p>
                  ))}
                </div>
              )}
              <button onClick={handleExportConsent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors">
                <Shield size={12} /> Export Consent Data
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
