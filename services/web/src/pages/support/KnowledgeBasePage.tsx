import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useKnowledgeBase, useCreateKbArticle, useUpdateKbArticle, useDeleteKbArticle, useVoteKbArticle, KnowledgeBaseArticle } from '@/lib/support'
import { Search, Plus, ThumbsUp, ThumbsDown, Trash2, Pencil, X, Check, BookOpen, Ticket } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'

export default function KnowledgeBasePage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: '', is_published: true })

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (category) params.category = category

  const { data, isLoading } = useKnowledgeBase(wid, Object.keys(params).length ? params : undefined)
  const articles = data?.data ?? []
  const createArticle = useCreateKbArticle(wid)
  const deleteArticle = useDeleteKbArticle(wid)

  const handleCreate = () => {
    if (!form.title.trim()) return
    createArticle.mutate(form as any, {
      onSuccess: () => { setShowForm(false); setForm({ title: '', content: '', category: '', is_published: true }) },
    })
  }

  if (!workspace) return null

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">Knowledge Base</h1>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…" containerClassName="!mb-0" className="!pl-8 !w-52" />
        </div>
        <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Filter category" containerClassName="!mb-0 !w-36" />
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={12} /> New article
        </Button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
          <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} containerClassName="!mb-0" />
          <textarea placeholder="Content (Markdown supported)" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] placeholder-[var(--color-text-muted)] resize-none font-mono" />
          <div className="flex items-center gap-3">
            <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} containerClassName="!mb-0 flex-1" />
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="accent-[var(--color-accent)]" />
              Published
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.title.trim()} loading={createArticle.isPending}>Create article</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><span className="text-[var(--color-text-muted)] text-sm">Loading…</span></div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--color-text-muted)]">
          <BookOpen size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No articles yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} onDelete={() => deleteArticle.mutate(article.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArticleCard({ article, onDelete }: { article: KnowledgeBaseArticle; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: article.title, content: article.content, category: article.category ?? '', is_published: article.is_published })
  const workspace = useAuthStore(s => s.workspace)
  const vote = useVoteKbArticle(workspace?.id, article.id)
  const updateArticle = useUpdateKbArticle(workspace?.id, article.id)

  const handleSave = () => {
    if (!editForm.title.trim()) return
    updateArticle.mutate(editForm as any, {
      onSuccess: () => setEditing(false),
    })
  }

  if (editing) {
    return (
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl p-4 space-y-3">
        <Input placeholder="Title" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} containerClassName="!mb-0" />
        <textarea placeholder="Content (Markdown supported)" value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} rows={6}
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] placeholder-[var(--color-text-muted)] resize-none font-mono" />
        <div className="flex items-center gap-3">
          <Input placeholder="Category" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} containerClassName="!mb-0 flex-1" />
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={editForm.is_published} onChange={e => setEditForm(f => ({ ...f, is_published: e.target.checked }))} className="accent-[var(--color-accent)]" />
            Published
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!editForm.title.trim()} loading={updateArticle.isPending}>Save</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors" onClick={() => setExpanded(v => !v)}>
        <BookOpen size={16} className="text-[var(--color-accent-text)] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">{article.title}</h3>
            {article.category && <Badge variant="default">{article.category}</Badge>}
            {!article.is_published && <Badge variant="warning">Draft</Badge>}
            {article.ticket_id && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                <Ticket size={9} /> From ticket
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-text-muted)]">
            <span>{article.views} views</span>
            <span className="flex items-center gap-1"><ThumbsUp size={9} /> {article.helpful_count}</span>
            <span className="flex items-center gap-1"><ThumbsDown size={9} /> {article.not_helpful_count}</span>
            {article.author && <span>By {article.author.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" iconOnly onClick={e => { e.stopPropagation(); setEditing(true); setEditForm({ title: article.title, content: article.content, category: article.category ?? '', is_published: article.is_published }) }} title="Edit">
            <Pencil size={12} />
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={e => { e.stopPropagation(); onDelete() }} title="Delete">
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[var(--color-glass-border)] px-4 py-3 space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{article.content}</p>
          <div className="flex items-center gap-2 border-t border-[var(--color-glass-border)] pt-2">
            <Button variant="ghost" size="sm" onClick={() => vote.mutate(true)}>
              <ThumbsUp size={11} /> Helpful
            </Button>
            <Button variant="ghost" size="sm" onClick={() => vote.mutate(false)}>
              <ThumbsDown size={11} /> Not helpful
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
