import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEmailTemplates, useCreateEmailTemplate, useDeleteEmailTemplate, EmailTemplate } from '@/lib/marketing'
import { Plus, Trash2, FileText } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'

export default function EmailTemplatesPage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [category, setCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', content_html: '', content_text: '', category: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const params: Record<string, string> = {}
  if (category) params.category = category

  const { data, isLoading } = useEmailTemplates(wid, Object.keys(params).length ? params : undefined)
  const templates = data?.data ?? []
  const createTemplate = useCreateEmailTemplate(wid)
  const deleteTemplate = useDeleteEmailTemplate(wid)

  if (!workspace) return null

  const handleCreate = () => {
    if (!form.name.trim() || !form.subject.trim()) return
    createTemplate.mutate(form as any, {
      onSuccess: () => { setShowForm(false); setForm({ name: '', subject: '', content_html: '', content_text: '', category: '' }) },
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">Email Templates</h1>
        <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Filter category" containerClassName="!mb-0 !w-36" />
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={12} /> New template
        </Button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
          <Input placeholder="Template name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} containerClassName="!mb-0" />
          <Input placeholder="Subject line" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} containerClassName="!mb-0" />
          <textarea placeholder="HTML content" value={form.content_html} onChange={e => setForm(f => ({ ...f, content_html: e.target.value }))} rows={5}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] placeholder-[var(--color-text-muted)] resize-none font-mono" />
          <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} containerClassName="!mb-0" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.name.trim() || !form.subject.trim()} loading={createTemplate.isPending}>Save</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><span className="text-[var(--color-text-muted)] text-sm">Loading…</span></div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
          <FileText size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No templates yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <FileText size={16} className="text-[var(--color-accent-text)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{t.name}</p>
                    {t.category && <Badge variant="default">{t.category}</Badge>}
                    {t.is_shared && <Badge variant="success">Shared</Badge>}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">{t.subject}</p>
                </div>
                <Button variant="ghost" size="sm" iconOnly onClick={e => { e.stopPropagation(); deleteTemplate.mutate(t.id) }} title="Delete">
                  <Trash2 size={13} />
                </Button>
              </div>
              {expandedId === t.id && (
                <div className="border-t border-[var(--color-glass-border)] px-4 py-3">
                  <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap max-h-60 overflow-y-auto bg-[var(--color-bg-elevated)] rounded-lg p-3">{t.content_html || t.content_text || 'No content'}</pre>
                  {t.createdBy && <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Created by {t.createdBy.name}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
