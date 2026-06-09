import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, Badge, Button, Input } from '@/components/ui'
import {
  Plus, Search, LayoutGrid, ListChecks, Mail, FileText,
  Kanban, BookOpen, Sparkles, Trash2, Copy, MoreHorizontal,
  Briefcase, Users, Wrench, Building2, ShoppingCart, HeartPulse,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import clsx from 'clsx'

interface Template {
  id: string
  workspace_id: string
  name: string
  type: 'board' | 'job_card' | 'invoice' | 'email' | 'report'
  description: string | null
  content: Record<string, unknown>
  variables: Record<string, string> | null
  version: string
  is_public: boolean
  created_by: string
  created_at: string
}

interface TemplateSuggestion {
  id: string
  name: string
  description: string
  category: 'engineering' | 'sales' | 'marketing' | 'operations' | 'support' | 'finance' | 'hr'
  icon: LucideIcon
  accent: string
  tags: string[]
  popular?: boolean
}

const CATEGORY_LABELS: Record<TemplateSuggestion['category'], string> = {
  engineering: 'Engineering',
  sales: 'Sales',
  marketing: 'Marketing',
  operations: 'Operations',
  support: 'Support',
  finance: 'Finance',
  hr: 'HR & People',
}

const CATEGORY_ACCENT: Record<TemplateSuggestion['category'], string> = {
  engineering: '#7c3aed',
  sales: '#06b6d4',
  marketing: '#ec4899',
  operations: '#f59e0b',
  support: '#10b981',
  finance: '#3b82f6',
  hr: '#f43f5e',
}

const SUGGESTED: TemplateSuggestion[] = [
  { id: 'sprint',     name: 'Engineering Sprint Board',     description: 'Run a 2-week sprint with backlog grooming, in-progress, review, and done columns.', category: 'engineering', icon: Kanban,      accent: '#7c3aed', tags: ['agile', 'scrum'],  popular: true },
  { id: 'incident',   name: 'Production Incident Response', description: 'Sev0-Sev3 escalation lanes, war-room channels, and post-mortem tasks baked in.',     category: 'engineering', icon: Wrench,      accent: '#7c3aed', tags: ['sre', 'on-call'] },
  { id: 'pipeline',   name: 'Sales Pipeline Tracker',      description: 'Lead → Qualified → Proposal → Won/Lost with revenue rollups and stale-deal alerts.', category: 'sales',        icon: Briefcase,   accent: '#06b6d4', tags: ['crm', 'forecast'], popular: true },
  { id: 'onboard',    name: 'Customer Onboarding',         description: 'Welcome sequence, kickoff checklist, training schedule, and check-in cadence.',     category: 'sales',        icon: Users,       accent: '#06b6d4', tags: ['cs', 'success'] },
  { id: 'campaign',   name: 'Marketing Campaign Hub',      description: 'Brief, creative, channels, schedule, KPIs, and post-mortem in one place.',           category: 'marketing',    icon: Mail,        accent: '#ec4899', tags: ['campaigns', 'content'], popular: true },
  { id: 'content',    name: 'Content Calendar',            description: 'Editorial calendar with draft → review → scheduled → published status lanes.',         category: 'marketing',    icon: FileText,    accent: '#ec4899', tags: ['editorial'] },
  { id: 'ops',        name: 'Operations & Vendor Hub',     description: 'Procurement, contracts, renewals, and vendor scorecards on a single board.',           category: 'operations',   icon: Building2,   accent: '#f59e0b', tags: ['procurement'] },
  { id: 'orders',     name: 'Purchase Order Workflow',     description: 'Requested → Approved → Ordered → Received → Paid with three-way match checks.',         category: 'operations',   icon: ShoppingCart,accent: '#f59e0b', tags: ['ap', 'spend'] },
  { id: 'support',    name: 'Customer Support Backlog',    description: 'Triage → In progress → Waiting customer → Resolved with SLA timers.',                 category: 'support',      icon: HeartPulse,  accent: '#10b981', tags: ['tickets', 'sla'], popular: true },
  { id: 'kb',         name: 'Knowledge Base Pipeline',     description: 'Draft → Review → Published → Archived with subject-matter expert assignment.',        category: 'support',      icon: BookOpen,    accent: '#10b981', tags: ['docs'] },
  { id: 'close',      name: 'Monthly Close Checklist',     description: 'Daily close tasks, journal entries, reconciliations, and sign-off gates.',           category: 'finance',      icon: ListChecks,  accent: '#3b82f6', tags: ['accounting'] },
  { id: 'review',     name: 'Performance Review Cycle',    description: 'Self-eval → peer → manager → calibration → 1:1 with goal tracking.',                  category: 'hr',           icon: Users,       accent: '#f43f5e', tags: ['people', 'goals'] },
]

type Tab = 'discover' | 'workspace' | 'public'

export default function TemplatesPage() {
  const w = useAuthStore(s => s.workspace?.id)
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('discover')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TemplateSuggestion['category'] | 'all'>('all')

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', w],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${w}/templates`)
      return ((res.data as { data?: Template[] })?.data ?? []) as Template[]
    },
    enabled: !!w,
  })

  const cloneTemplate = useMutation({
    mutationFn: async (t: TemplateSuggestion) => {
      await api.post(`/workspaces/${w}/templates`, {
        name: t.name,
        type: 'board',
        description: t.description,
        content: { suggestion_id: t.id, tags: t.tags, category: t.category },
        variables: null,
        is_public: false,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success(`Template added to your workspace.`)
      setTab('workspace')
    },
    onError: () => toast.error('Failed to add template.'),
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${w}/templates/${id}`)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Template deleted.') },
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SUGGESTED.filter(t => {
      if (category !== 'all' && t.category !== category) return false
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      )
    })
  }, [query, category])

  const categories = Object.keys(CATEGORY_LABELS) as TemplateSuggestion['category'][]
  const popular = SUGGESTED.filter(s => s.popular)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      <div className="px-8 pt-6 pb-4 border-b shrink-0" style={{ borderColor: 'var(--color-glass-border)' }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <LayoutGrid size={18} style={{ color: 'var(--color-accent-text)' }} />
              Template Library
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Start fast with pre-built boards, runbooks, and workflows. Customize anything.
            </p>
          </div>
          <Button size="sm"><Plus size={12} /> New from scratch</Button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)' }}>
            {([
              { id: 'discover',  label: 'Discover',  count: SUGGESTED.length },
              { id: 'workspace', label: 'Your workspace', count: templates?.length ?? 0 },
              { id: 'public',    label: 'Public',    count: 0 },
            ] as { id: Tab; label: string; count: number }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  tab === t.id
                    ? 'shadow-sm'
                    : 'hover:bg-[var(--color-bg-hover)]'
                )}
                style={tab === t.id
                  ? { background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }
                  : { color: 'var(--color-text-muted)' }
                }
              >
                {t.label}
                <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search templates…"
            size="sm"
            containerClassName="!mb-0 !w-64"
            icon={Search}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6 max-w-7xl mx-auto">
          {tab === 'discover' && (
            <div className="space-y-8">
              {query.trim() === '' && category === 'all' && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} style={{ color: '#f59e0b' }} />
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Most popular</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {popular.map(s => <TemplateCard key={s.id} t={s} onUse={() => cloneTemplate.mutate(s)} cloning={cloneTemplate.isPending} />)}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-3 overflow-x-auto">
                  <button
                    onClick={() => setCategory('all')}
                    className={clsx(
                      'text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap',
                      category === 'all' ? 'font-semibold' : ''
                    )}
                    style={category === 'all'
                      ? { background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }
                      : { color: 'var(--color-text-muted)' }
                    }
                  >
                    All categories
                  </button>
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={clsx(
                        'text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap',
                        category === c ? 'font-semibold' : ''
                      )}
                      style={category === c
                        ? { background: CATEGORY_ACCENT[c] + '25', color: CATEGORY_ACCENT[c] }
                        : { color: 'var(--color-text-muted)' }
                      }
                    >
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-16" style={{ color: 'var(--color-text-muted)' }}>
                    <Search size={28} className="opacity-40 mb-2" />
                    <p className="text-sm">No templates match your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filtered.map(s => <TemplateCard key={s.id} t={s} onUse={() => cloneTemplate.mutate(s)} cloning={cloneTemplate.isPending} />)}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === 'workspace' && (
            <div>
              {isLoading ? (
                <div className="flex justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="text-sm">Loading…</span>
                </div>
              ) : (templates?.length ?? 0) === 0 ? (
                <Card className="p-12 flex flex-col items-center text-center">
                  <LayoutGrid size={32} className="opacity-40 mb-3" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No templates yet</p>
                  <p className="text-xs mt-1 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
                    Switch to <button onClick={() => setTab('discover')} className="underline" style={{ color: 'var(--color-accent-text)' }}>Discover</button> to add a template, or build one from scratch.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setTab('discover')}>Browse Discover</Button>
                    <Button size="sm"><Plus size={12} /> New template</Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates!.map(t => (
                    <Card key={t.id} className="p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="default">{t.type}</Badge>
                        <button
                          onClick={() => { if (confirm('Delete this template?')) deleteTemplate.mutate(t.id) }}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                          aria-label="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.name}</p>
                      {t.description && (
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{t.description}</p>
                      )}
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>v{t.version}</span>
                        <Button size="sm" variant="ghost">
                          <Copy size={10} /> Use
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'public' && (
            <Card className="p-12 flex flex-col items-center text-center">
              <Badge variant="success" className="mb-3">Coming soon</Badge>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Public template marketplace</p>
              <p className="text-xs mt-1 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
                Share and discover templates from the Aquerii community. We&apos;re putting the final touches on review and moderation.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ t, onUse, cloning }: { t: TemplateSuggestion; onUse: () => void; cloning: boolean }) {
  const Icon = t.icon
  return (
    <Card className="group p-0 overflow-hidden flex flex-col transition-all hover:translate-y-[-2px]" style={{ border: '1px solid var(--color-glass-border)' }}>
      <div className="h-20 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${t.accent}30 0%, ${t.accent}05 100%)` }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={36} style={{ color: t.accent, opacity: 0.7 }} />
        </div>
        <span
          className="absolute top-2 right-2 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
          style={{ background: t.accent + '20', color: t.accent }}
        >
          {CATEGORY_LABELS[t.category]}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{t.name}</p>
        <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{t.description}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {t.tags.map(tag => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-2 flex items-center gap-1.5">
          <Button size="sm" onClick={onUse} loading={cloning} className="flex-1">
            <Plus size={11} /> Add to workspace
          </Button>
          <Button size="sm" variant="ghost" iconOnly aria-label="Preview">
            <MoreHorizontal size={12} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
