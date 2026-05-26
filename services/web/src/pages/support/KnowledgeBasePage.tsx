import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useKnowledgeBase, useCreateKbArticle, useDeleteKbArticle, useVoteKbArticle, KnowledgeBaseArticle } from '@/lib/support'
import { Search, Plus, Loader2, ThumbsUp, ThumbsDown, Trash2, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

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
        <h1 className="text-lg font-semibold text-white flex-1">Knowledge Base</h1>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…" className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52" />
        </div>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Filter category" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36" />
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={12} /> New article
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
          <textarea placeholder="Content (Markdown supported)" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 resize-none font-mono" />
          <div className="flex items-center gap-3">
            <input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600" />
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="rounded" />
              Published
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5">Cancel</button>
            <button onClick={handleCreate} disabled={!form.title.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
              Create article
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-600">
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
  const workspace = useAuthStore(s => s.workspace)
  const vote = useVoteKbArticle(workspace?.id, article.id)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => setExpanded(v => !v)}>
        <BookOpen size={16} className="text-indigo-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white truncate">{article.title}</h3>
            {article.category && <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{article.category}</span>}
            {!article.is_published && <span className="text-[10px] text-yellow-500 bg-yellow-900/30 px-1.5 py-0.5 rounded">Draft</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
            <span>{article.views} views</span>
            <span className="flex items-center gap-1"><ThumbsUp size={9} /> {article.helpful_count}</span>
            <span className="flex items-center gap-1"><ThumbsDown size={9} /> {article.not_helpful_count}</span>
            {article.author && <span>By {article.author.name}</span>}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-gray-600 hover:text-red-400 transition-colors shrink-0"><Trash2 size={13} /></button>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-3">
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{article.content}</p>
          <div className="flex items-center gap-2 border-t border-gray-800 pt-2">
            <button onClick={() => vote.mutate(true)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-400 transition-colors"><ThumbsUp size={11} /> Helpful</button>
            <button onClick={() => vote.mutate(false)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"><ThumbsDown size={11} /> Not helpful</button>
          </div>
        </div>
      )}
    </div>
  )
}
