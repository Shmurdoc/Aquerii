/**
 * Scanned Documents service — backed by the native Laravel scanned-documents API.
 * Replaces the old paperless-ngx proxy approach.
 *
 * All requests: /api/workspaces/{workspaceId}/scanned-documents[/*]
 */
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaperlessDocument {
  id: string                  // UUID
  workspace_id: string
  title: string
  original_filename: string
  mime_type: string
  file_size: number
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed'
  ocr_text?: string | null
  page_count?: number | null
  tags: string[]              // plain string tags stored as JSON array
  metadata?: Record<string, unknown> | null
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface PaperlessTag {
  id: string    // tag name used as id for simplicity
  name: string
  colour: number
  slug: string
}

export interface PaperlessListResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface AIAnalyzeResult {
  document_id: string
  summary: string
  extracted_dates: string[]
  extracted_totals: Record<string, unknown>[]
  entities: Record<string, string[]>
  document_type_suggestion: string
}

export interface AIAutoTagResult {
  document_id: string
  suggested_tags: string[]
  tags_created: string[]
  tags_applied: string[]
}

export interface AILinkDealResult {
  document_id: string
  deal_id: string
  note_added: boolean
  note_content: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _workspaceId = ''

/** Call once on mount with the current workspace id */
export function setWorkspaceId(id: string) {
  _workspaceId = id
}

function base() {
  return `/workspaces/${_workspaceId}/scanned-documents`
}

/** Normalise raw API response to PaperlessDocument shape */
function normalizeDoc(raw: Record<string, unknown>): PaperlessDocument {
  return {
    id: raw.id as string,
    workspace_id: raw.workspace_id as string,
    title: (raw.title as string) ?? (raw.original_filename as string) ?? '',
    original_filename: raw.original_filename as string,
    mime_type: raw.mime_type as string,
    file_size: raw.file_size as number,
    ocr_status: (raw.ocr_status as PaperlessDocument['ocr_status']) ?? 'pending',
    ocr_text: raw.ocr_text as string | null | undefined,
    page_count: raw.page_count as number | null | undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    metadata: raw.metadata as Record<string, unknown> | null | undefined,
    uploaded_by: raw.uploaded_by as string,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  }
}

/** Download URL — returns a redirect to a presigned S3 URL via Laravel */
export const downloadUrl = (docId: string) =>
  `/api/workspaces/${_workspaceId}/scanned-documents/${docId}/download`

/** Thumbnail: try to derive from mime_type (no sidecar needed) */
export const thumbnailUrl = (_docId: string) => ''   // no thumbnail endpoint yet; callers fall back to icon

// ── Documents ─────────────────────────────────────────────────────────────────

export async function listDocuments(params?: {
  page?: number
  page_size?: number
  search?: string
  tags__id__all?: string[]
}): Promise<PaperlessListResponse<PaperlessDocument>> {
  const apiParams: Record<string, unknown> = {}
  if (params?.page)      apiParams.page      = params.page
  if (params?.page_size) apiParams.per_page  = params.page_size
  if (params?.search)    apiParams.search    = params.search
  // tag filter — we'll filter client-side since backend doesn't have tag query yet
  const res = await api.get(base(), { params: apiParams })
  const items: PaperlessDocument[] = (res.data.data ?? []).map(normalizeDoc)
  const total = res.data.meta?.total ?? items.length

  // client-side tag filter
  const tagFilter = params?.tags__id__all
  const filtered = tagFilter?.length
    ? items.filter(d => tagFilter.every(t => d.tags.includes(t)))
    : items

  return {
    count: filtered.length,
    next: null,
    previous: null,
    results: filtered,
  }
}

export async function getDocument(id: string): Promise<PaperlessDocument> {
  const res = await api.get(`${base()}/${id}`)
  return normalizeDoc(res.data.data)
}

export async function uploadDocument(file: File, title?: string): Promise<PaperlessDocument> {
  const form = new FormData()
  form.append('file', file)
  if (title) form.append('title', title)
  const res = await api.post(base(), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return normalizeDoc(res.data.data)
}

export async function updateDocument(
  id: string,
  patch: { title?: string; tags?: string[] }
): Promise<PaperlessDocument> {
  const res = await api.patch(`${base()}/${id}`, patch)
  return normalizeDoc(res.data.data)
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`${base()}/${id}`)
}

// ── Tags (derived from all documents' tag arrays — no separate endpoint) ──────

export async function listTags(): Promise<PaperlessListResponse<PaperlessTag>> {
  const res = await api.get(base(), { params: { per_page: 200 } })
  const docs: PaperlessDocument[] = (res.data.data ?? []).map(normalizeDoc)
  // collect unique tag names across all docs
  const tagSet = new Set<string>()
  docs.forEach(d => d.tags.forEach(t => tagSet.add(t)))
  const tags: PaperlessTag[] = [...tagSet].sort().map(name => ({
    id: name,
    name,
    colour: 1,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
  }))
  return { count: tags.length, next: null, previous: null, results: tags }
}

export async function createTag(name: string): Promise<PaperlessTag> {
  // Tags are implicit — just return a local object; the tag becomes real
  // when attached to a document via updateDocument.
  return { id: name, name, colour: 1, slug: name.toLowerCase().replace(/\s+/g, '-') }
}

export async function deleteTag(_id: string): Promise<void> {
  // No server-side tag entity; tag is deleted by removing from all documents.
  // Silently succeed — FilesPage handles UI state.
}

// ── AI agent endpoints ────────────────────────────────────────────────────────

export async function aiAnalyzeDocument(
  workspaceId: string,
  documentId: string
): Promise<AIAnalyzeResult> {
  const res = await api.post<{ data: AIAnalyzeResult }>(
    `/workspaces/${workspaceId}/ai/document/analyze`,
    { document_id: documentId }
  )
  return res.data.data
}

export async function aiAutoTag(
  workspaceId: string,
  documentId: string
): Promise<AIAutoTagResult> {
  const res = await api.post<{ data: AIAutoTagResult }>(
    `/workspaces/${workspaceId}/ai/document/auto-tag`,
    { document_id: documentId }
  )
  return res.data.data
}

export async function aiLinkDeal(
  workspaceId: string,
  documentId: string,
  dealId: string
): Promise<AILinkDealResult> {
  const res = await api.post<{ data: AILinkDealResult }>(
    `/workspaces/${workspaceId}/ai/document/link-deal`,
    { document_id: documentId, deal_id: dealId }
  )
  return res.data.data
}
