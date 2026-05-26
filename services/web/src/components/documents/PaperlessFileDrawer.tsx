/**
 * PaperlessFileDrawer — right-side panel for a single paperless document.
 * Shows metadata, a content preview, and AI action buttons:
 *  - Analyze (extract summary, totals, entities)
 *  - Auto-tag  (AI generates + applies tags)
 *  - Link to Deal (attach document to a CRM deal)
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  type PaperlessDocument,
  type AIAnalyzeResult,
  type AIAutoTagResult,
  type PaperlessTag,
  downloadUrl,
  deleteDocument,
  aiAnalyzeDocument,
  aiAutoTag,
  aiLinkDeal,
  listTags,
} from '@/lib/paperless'
import { api } from '@/lib/api'
import { AI_CREDIT_COSTS } from '@/lib/aiCosts'
import {
  X, Download, Sparkles, Tag, Link2, Loader2, ChevronDown, ChevronUp,
  Calendar, FileType, Hash, Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  doc: PaperlessDocument
  workspaceId: string
  onClose: () => void
  onDeleted: () => void
}

// ── Deal picker (minimal inline select) ─────────────────────────────────────

function DealPicker({
  workspaceId,
  onLink,
  disabled,
}: {
  workspaceId: string
  onLink: (dealId: string) => void
  disabled: boolean
}) {
  const { data: pipelines = [] } = useQuery({
    queryKey: ['crm-pipelines', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/crm/pipelines`)
      return res.data.data
    },
  })

  const pipelineId = pipelines[0]?.id

  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals', workspaceId, pipelineId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/crm/deals`, {
        params: { pipeline_id: pipelineId },
      })
      return res.data.data
    },
    enabled: !!pipelineId,
  })

  const [selected, setSelected] = useState('')

  return (
    <div className="flex items-center gap-2 mt-2">
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="">Select a deal…</option>
        {deals.map((d: any) => (
          <option key={d.id} value={d.id}>{d.title}</option>
        ))}
      </select>
      <button
        disabled={!selected || disabled}
        onClick={() => onLink(selected)}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
      >
        {disabled ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
        Link
      </button>
    </div>
  )
}

// ── Section toggle ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-gray-800 pt-3 mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-xs font-medium text-gray-400 hover:text-white transition-colors"
      >
        {title}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export default function PaperlessFileDrawer({ doc, workspaceId, onClose, onDeleted }: Props) {
  const qc = useQueryClient()

  // Fetch tag list so we can resolve IDs → names
  const { data: tagList = [] } = useQuery<PaperlessTag[]>({
    queryKey: ['paperless-tags', workspaceId],
    queryFn: async () => {
      const res = await listTags()
      return res.results
    },
    staleTime: 5 * 60 * 1000,
  })
  const tagMap = Object.fromEntries(tagList.map(t => [t.id, t]))

  const [analysis, setAnalysis]     = useState<AIAnalyzeResult | null>(null)
  const [autoTagResult, setAutoTag] = useState<AIAutoTagResult | null>(null)
  const [showDealPicker, setDealPicker] = useState(false)
  const [linkResult, setLinkResult]  = useState<string | null>(null)

  // ── AI mutations ──────────────────────────────────────────────────────────

  const analyze = useMutation({
    mutationFn: () => aiAnalyzeDocument(workspaceId, doc.id),
    onSuccess: (data) => { setAnalysis(data); toast.success('Analysis complete.') },
    onError:   () => toast.error('Analysis failed.'),
  })

  const autoTag = useMutation({
    mutationFn: () => aiAutoTag(workspaceId, doc.id),
    onSuccess: (data) => {
      setAutoTag(data)
      qc.invalidateQueries({ queryKey: ['paperless-docs', workspaceId] })
      toast.success(`Applied ${data.tags_applied.length} tag(s).`)
    },
    onError: () => toast.error('Auto-tag failed.'),
  })

  const linkDeal = useMutation({
    mutationFn: (dealId: string) => aiLinkDeal(workspaceId, doc.id, dealId),
    onSuccess: (data) => {
      setLinkResult(data.note_content)
      setDealPicker(false)
      toast.success('Linked to deal.')
    },
    onError: () => toast.error('Link failed.'),
  })

  const anyLoading = analyze.isPending || autoTag.isPending || linkDeal.isPending

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(doc.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paperless-docs', workspaceId] })
      toast.success('Document deleted.')
      onDeleted()
    },
    onError: () => toast.error('Delete failed.'),
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop (click-away) */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] bg-gray-900 border-l border-gray-800 z-40 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-800">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{doc.original_filename}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={downloadUrl(doc.id)}
              download
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Download"
            >
              <Download size={15} />
            </a>
            <button
              onClick={() => {
                if (confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Delete document"
            >
              {deleteMutation.isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <Trash2 size={15} />
              }
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4 text-xs space-y-1">

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar size={11} />
              <span>Added</span>
            </div>
            <span className="text-gray-300">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>

            <div className="flex items-center gap-1.5 text-gray-500">
              <FileType size={11} />
              <span>Pages</span>
            </div>
            <span className="text-gray-300">{doc.page_count ?? '—'}</span>

            <div className="flex items-center gap-1.5 text-gray-500">
              <Hash size={11} />
              <span>ID</span>
            </div>
            <span className="text-gray-300 font-mono">{doc.id}</span>
          </div>

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="mt-3">
              <p className="text-gray-500 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {doc.tags.map(tid => (
                  <span
                    key={tid}
                    className="bg-indigo-600/20 text-indigo-300 text-xs px-1.5 py-0.5 rounded"
                  >
                    {tagMap[tid]?.name ?? `#${tid}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Actions ─────────────────────────────────────────────────── */}
          <div className="border-t border-gray-800 pt-3 mt-4">
            <p className="text-gray-400 font-medium mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-400" />
              AI Actions
            </p>

            <div className="flex flex-col gap-2">
              {/* Analyze */}
              <button
                onClick={() => analyze.mutate()}
                disabled={anyLoading}
                className="flex items-center gap-2 w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 hover:border-indigo-500/40 rounded-lg px-3 py-2 text-xs text-gray-300 hover:text-white transition-colors"
              >
                {analyze.isPending
                  ? <Loader2 size={13} className="animate-spin text-indigo-400" />
                  : <Sparkles size={13} className="text-indigo-400" />
                }
                <span>Analyze document</span>
                <span className="ml-auto text-gray-600">{AI_CREDIT_COSTS.analyzeDocument} credits</span>
              </button>

              {/* Auto-tag */}
              <button
                onClick={() => autoTag.mutate()}
                disabled={anyLoading}
                className="flex items-center gap-2 w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 hover:border-indigo-500/40 rounded-lg px-3 py-2 text-xs text-gray-300 hover:text-white transition-colors"
              >
                {autoTag.isPending
                  ? <Loader2 size={13} className="animate-spin text-indigo-400" />
                  : <Tag size={13} className="text-indigo-400" />
                }
                <span>Auto-tag</span>
                <span className="ml-auto text-gray-600">{AI_CREDIT_COSTS.autoTagDocument} credits</span>
              </button>

              {/* Link to deal */}
              <button
                onClick={() => setDealPicker(v => !v)}
                disabled={anyLoading}
                className={clsx(
                  'flex items-center gap-2 w-full border rounded-lg px-3 py-2 text-xs transition-colors',
                  showDealPicker
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-indigo-500/40 text-gray-300 hover:text-white'
                )}
              >
                <Link2 size={13} className="text-indigo-400" />
                <span>Link to CRM deal</span>
                <span className="ml-auto text-gray-600">{AI_CREDIT_COSTS.linkDocumentToDeal} credits</span>
              </button>

              {showDealPicker && (
                <DealPicker
                  workspaceId={workspaceId}
                  onLink={(id) => linkDeal.mutate(id)}
                  disabled={linkDeal.isPending}
                />
              )}
            </div>
          </div>

          {/* Analysis result */}
          {analysis && (
            <Section title="Analysis Result" defaultOpen>
              <div className="space-y-2">
                <div>
                  <p className="text-gray-500 mb-1">Summary</p>
                  <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
                </div>
                {analysis.document_type_suggestion && (
                  <div>
                    <p className="text-gray-500 mb-1">Type</p>
                    <span className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-gray-300">
                      {analysis.document_type_suggestion}
                    </span>
                  </div>
                )}
                {analysis.extracted_dates.length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Dates</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.extracted_dates.map((d, i) => (
                        <span key={i} className="bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-300 font-mono">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.extracted_totals.length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Totals</p>
                    <pre className="bg-gray-800 rounded p-2 text-gray-300 text-[10px] overflow-auto max-h-24">
                      {JSON.stringify(analysis.extracted_totals, null, 2)}
                    </pre>
                  </div>
                )}
                {Object.keys(analysis.entities).length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Entities</p>
                    {Object.entries(analysis.entities).map(([type, vals]) => (
                      <div key={type} className="mb-1">
                        <span className="text-gray-600 capitalize">{type}: </span>
                        <span className="text-gray-300">{(vals as string[]).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Auto-tag result */}
          {autoTagResult && (
            <Section title="Auto-tag Result" defaultOpen>
              <div className="space-y-1">
                <p className="text-gray-500">Applied:</p>
                <div className="flex flex-wrap gap-1">
                  {autoTagResult.tags_applied.map(t => (
                    <span key={t} className="bg-indigo-600/20 text-indigo-300 px-1.5 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
                {autoTagResult.tags_created.length > 0 && (
                  <p className="text-gray-600 mt-1">
                    Created: {autoTagResult.tags_created.join(', ')}
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* Deal link result */}
          {linkResult && (
            <Section title="Deal Link" defaultOpen>
              <p className="text-gray-300">{linkResult}</p>
            </Section>
          )}

          {/* Content preview */}
          {doc.ocr_text && (
            <Section title="Content Preview">
              <p className="text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-20">
                {doc.ocr_text.slice(0, 1500)}
                {doc.ocr_text.length > 1500 && '…'}
              </p>
            </Section>
          )}
        </div>
      </div>
    </>
  )
}
