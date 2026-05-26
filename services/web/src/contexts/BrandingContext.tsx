import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface BrandingData {
  workspaceId: string | null
  name: string
  logoUrl: string | null
  color: string
  icon: string | null
  docTemplate: 'modern' | 'classic' | 'minimal'
  isDefault: boolean
}

const defaultBranding: BrandingData = {
  workspaceId: null,
  name: 'Aquerii',
  logoUrl: null,
  color: '#7c3aed',
  icon: null,
  docTemplate: 'modern',
  isDefault: true,
}

const BrandingContext = createContext<BrandingData>(defaultBranding)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingData>(defaultBranding)

  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          setBranding({
            workspaceId: data.workspace_id,
            name: data.name,
            logoUrl: data.logo_url,
            color: data.color,
            icon: data.icon,
            docTemplate: data.doc_template ?? 'modern',
            isDefault: data.is_default,
          })
          // Apply brand colour as CSS variable
          document.documentElement.style.setProperty('--color-accent', data.color)
          // Derive hover/light/glow variants
          document.documentElement.style.setProperty('--color-accent-light', hexToRgba(data.color, 0.15))
          document.documentElement.style.setProperty('--color-accent-glow', hexToRgba(data.color, 0.35))
        }
      })
      .catch(() => {/* keep defaults on network error */})
  }, [])

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
