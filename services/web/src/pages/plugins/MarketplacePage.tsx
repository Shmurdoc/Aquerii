import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { Package, Search, Download, Trash2, Settings, ToggleLeft, ToggleRight, Star, Check } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface Plugin {
  id: string
  slug: string
  name: string
  description: string | null
  version: string
  author: string | null
  category: string
  icon_url: string | null
  is_active: boolean
  is_official: boolean
  install_count: number
  rating: number
  hooks: string[]
  settings_schema: Record<string, unknown>
  is_installed?: boolean
}

interface Installation {
  id: string
  plugin_id: string
  is_enabled: boolean
  settings: Record<string, unknown>
  installed_at: string
  plugin?: Plugin
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'automation', label: 'Automation' },
  { value: 'communication', label: 'Communication' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'integration', label: 'Integration' },
  { value: 'security', label: 'Security' },
]

export default function MarketplacePage() {
  const workspace = useAuthStore(s => s.workspace)
  const wid = workspace?.id ?? ''
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'marketplace' | 'installed'>('marketplace')
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<Record<string, unknown>>({})

  const { data: pluginsData, isLoading } = useQuery<{ data: Plugin[] }>({
    queryKey: ['plugins', 'marketplace', category, search],
    queryFn: () => api.get(`/workspaces/${wid}/plugins/marketplace`, { params: { category: category || undefined, search: search || undefined } }).then(r => r.data),
    enabled: !!wid && tab === 'marketplace',
  })

  const { data: installedData } = useQuery<{ data: Installation[] }>({
    queryKey: ['plugins', 'installed', wid],
    queryFn: () => api.get(`/workspaces/${wid}/plugins/installed`).then(r => r.data),
    enabled: !!wid && tab === 'installed',
  })

  const install = useMutation({
    mutationFn: (pluginId: string) => api.post(`/workspaces/${wid}/plugins/${pluginId}/install`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plugins'] }); toast.success('Plugin installed') },
    onError: () => toast.error('Failed to install'),
  })

  const uninstall = useMutation({
    mutationFn: (pluginId: string) => api.delete(`/workspaces/${wid}/plugins/${pluginId}/uninstall`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plugins'] }); toast.success('Plugin uninstalled') },
  })

  const toggle = useMutation({
    mutationFn: (pluginId: string) => api.post(`/workspaces/${wid}/plugins/${pluginId}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plugins'] }); toast.success('Plugin toggled') },
  })

  const updateSettings = useMutation({
    mutationFn: ({ pluginId, settings }: { pluginId: string; settings: Record<string, unknown> }) =>
      api.patch(`/workspaces/${wid}/plugins/${pluginId}/settings`, { settings }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plugins'] }); setShowSettings(false); toast.success('Settings saved') },
  })

  const plugins = pluginsData?.data ?? []
  const installed = installedData?.data ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-glass-border)] shrink-0">
        <Package size={16} className="text-[var(--color-text-muted)]" />
        <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Plugins</h1>
        <div className="flex gap-1 ml-4">
          <button onClick={() => setTab('marketplace')} className={clsx('text-xs px-3 py-1 rounded transition-colors', tab === 'marketplace' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]')}>Marketplace</button>
          <button onClick={() => setTab('installed')} className={clsx('text-xs px-3 py-1 rounded transition-colors', tab === 'installed' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]')}>Installed ({installed.length})</button>
        </div>
        <div className="flex-1" />
        {tab === 'marketplace' && (
          <div className="flex gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plugins..." className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] w-48" />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-primary)]">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'marketplace' ? (
          isLoading ? (
            <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
          ) : plugins.length === 0 ? (
            <div className="text-center py-16">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No plugins found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plugins.map(plugin => (
                <PluginCard key={plugin.id} plugin={plugin} onInstall={() => install.mutate(plugin.id)} onUninstall={() => uninstall.mutate(plugin.id)} onSettings={() => { setSelectedPlugin(plugin); setSettingsForm(plugin.settings_schema); setShowSettings(true) }} isInstalling={install.isPending} />
              ))}
            </div>
          )
        ) : (
          installed.length === 0 ? (
            <div className="text-center py-16">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No plugins installed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {installed.map(inst => (
                <InstalledCard key={inst.id} installation={inst} onToggle={() => toggle.mutate(inst.plugin_id)} onUninstall={() => uninstall.mutate(inst.plugin_id)} onSettings={() => { setSelectedPlugin(inst.plugin ?? null); setSettingsForm(inst.settings); setShowSettings(true) }} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Settings modal */}
      {showSettings && selectedPlugin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-surface)] rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--color-text-primary)]">{selectedPlugin.name} Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-[var(--color-text-muted)]"><span className="text-lg">×</span></button>
            </div>
            <div className="space-y-3">
              {Object.entries(selectedPlugin.settings_schema).map(([key, defaultValue]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)] capitalize">{key.replace(/_/g, ' ')}</label>
                  <input
                    value={String(settingsForm[key] ?? defaultValue ?? '')}
                    onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              ))}
              {Object.keys(selectedPlugin.settings_schema).length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">No configurable settings</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button size="sm" onClick={() => updateSettings.mutate({ pluginId: selectedPlugin.id, settings: settingsForm })}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PluginCard({ plugin, onInstall, onUninstall, onSettings, isInstalling }: { plugin: Plugin; onInstall: () => void; onUninstall: () => void; onSettings: () => void; isInstalling: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-glass-bg)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: 'var(--color-bg-hover)' }}>
          {plugin.icon_url ? <img src={plugin.icon_url} alt="" className="w-6 h-6" /> : <Package size={20} className="text-[var(--color-text-muted)]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">{plugin.name}</h3>
            {plugin.is_official && <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">Official</span>}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">v{plugin.version} · {plugin.author}</p>
        </div>
      </div>
      {plugin.description && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-3 line-clamp-2">{plugin.description}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1"><Download size={11} /> {plugin.install_count}</span>
          <span className="flex items-center gap-1"><Star size={11} /> {plugin.rating}</span>
        </div>
        {plugin.is_installed ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onSettings}><Settings size={12} /></Button>
            <Button size="sm" variant="ghost" onClick={onUninstall} className="text-red-400"><Trash2 size={12} /></Button>
          </div>
        ) : (
          <Button size="sm" onClick={onInstall} disabled={isInstalling}>
            <Download size={12} /> Install
          </Button>
        )}
      </div>
    </div>
  )
}

function InstalledCard({ installation, onToggle, onUninstall, onSettings }: { installation: Installation; onToggle: () => void; onUninstall: () => void; onSettings: () => void }) {
  const plugin = installation.plugin
  if (!plugin) return null

  return (
    <div className="flex items-center gap-4 rounded-xl border p-4" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-glass-bg)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-bg-hover)' }}>
        <Package size={20} className="text-[var(--color-text-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{plugin.name}</h3>
        <p className="text-xs text-[var(--color-text-muted)]">v{plugin.version} · Installed {new Date(installation.installed_at).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className="transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          {installation.is_enabled ? <ToggleRight size={20} style={{ color: 'var(--color-accent)' }} /> : <ToggleLeft size={20} />}
        </button>
        <Button size="sm" variant="ghost" onClick={onSettings}><Settings size={13} /></Button>
        <Button size="sm" variant="ghost" onClick={onUninstall} className="text-red-400"><Trash2 size={13} /></Button>
      </div>
    </div>
  )
}
