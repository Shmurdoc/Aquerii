import { useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { useUpdateWorkspace } from '@/hooks/useSettings'
import { settingsApi } from '@/lib/settings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'

const ACCENT_PRESETS = [
  { name: 'Violet',  color: '#7c3aed' },
  { name: 'Blue',    color: '#2563eb' },
  { name: 'Cyan',    color: '#0891b2' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Rose',    color: '#e11d48' },
  { name: 'Amber',   color: '#d97706' },
]

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

function applyAccentColor(hex: string) {
  const root = document.documentElement
  root.style.setProperty('--color-accent', hex)
  root.style.setProperty('--color-accent-hover', hex + 'cc')
  root.style.setProperty('--color-accent-light', `rgba(${hexToRgb(hex)}, 0.15)`)
  root.style.setProperty('--color-accent-glow',  `rgba(${hexToRgb(hex)}, 0.35)`)
}

export default function GeneralTab() {
  const workspace    = useAuthStore((s) => s.workspace)!
  const setWorkspace = useAuthStore((s) => s.setWorkspace)
  const navigate     = useNavigate()
  const update       = useUpdateWorkspace()
  const fileRef      = useRef<HTMLInputElement>(null)

  const [name,         setName]         = useState(workspace.name)
  const [icon,         setIcon]         = useState('')
  const [color,        setColor]        = useState(workspace.color ?? '#7c3aed')
  const [logoUploading, setLogoUploading] = useState(false)

  const logoUrl = workspace.logo_url ?? null

  async function handleAccentPreset(hex: string) {
    setColor(hex)
    applyAccentColor(hex)
    try {
      const updated = await settingsApi.updateWorkspace({ color: hex })
      setWorkspace(updated)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to update accent color')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: { name?: string; icon?: string; color?: string } = {}
    if (name !== workspace.name) payload.name = name
    if (icon)  payload.icon  = icon
    if (color !== (workspace.color ?? '#7c3aed')) payload.color = color
    if (Object.keys(payload).length === 0) return
    await update.mutateAsync(payload)
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const result = await settingsApi.uploadLogo(file)
      setWorkspace({ ...workspace, logo_url: result.logo_url })
      toast.success('Logo updated')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Upload failed')
    } finally {
      setLogoUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    setLogoUploading(true)
    try {
      await settingsApi.removeLogo()
      setWorkspace({ ...workspace, logo_url: null })
      toast.success('Logo removed')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Remove failed')
    } finally {
      setLogoUploading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-100 mb-1">General</h2>
      <p className="text-xs text-gray-500 mb-6">Manage your workspace name and branding.</p>

      <div className="mb-6">
        <label className="text-xs text-gray-500 block mb-2">Workspace Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-gray-800 border border-gray-700 flex-shrink-0">
            {logoUploading ? (
              <svg className="animate-spin w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : logoUrl ? (
              <img src={logoUrl} alt={workspace.name} className="w-full h-full object-contain" />
            ) : (
              <Avatar name={workspace.name} size="xl" shape="rounded" color={workspace.color ?? '#7c3aed'} />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={logoUploading}
              loading={logoUploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload Logo
            </Button>
            {logoUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={logoUploading}
                onClick={handleRemoveLogo}
              >
                Remove Logo
              </Button>
            )}
            <p className="text-[11px] text-gray-600">PNG, JPEG, WebP or SVG. Max 2 MB.</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-xs text-gray-500 block mb-2">Accent Colour</label>
        <div className="flex items-center gap-2">
          {ACCENT_PRESETS.map(({ name: presetName, color: hex }) => {
            const isActive = color === hex || (!color && hex === '#7c3aed')
            return (
              <button
                key={hex}
                type="button"
                title={presetName}
                aria-label={`${presetName} accent`}
                onClick={() => handleAccentPreset(hex)}
                style={{ backgroundColor: hex }}
                className="w-6 h-6 rounded-full flex-shrink-0 transition-all hover:scale-110"
              >
                {isActive && (
                  <span className="flex items-center justify-center w-full h-full">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Input
          label="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="sm"
        />

        <p className="text-xs text-gray-600">Plan: <span className="capitalize text-gray-400">{workspace.plan}</span></p>
        <p className="text-xs text-gray-600">Slug: <span className="font-mono text-gray-400">{workspace.slug}</span></p>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={update.isPending || name === workspace.name}
            loading={update.isPending}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => navigate('/settings/team')}
          >
            Manage Team
          </Button>
        </div>
      </form>
    </div>
  )
}
