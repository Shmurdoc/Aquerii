import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function PortalLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-deepest)] text-[var(--color-text-primary)]">
      <header className="border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white shrink-0"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Sparkles size={18} />
          </div>
          <span className="font-semibold text-sm">Aquerii</span>
          <span className="text-[var(--color-text-muted)] text-xs ml-auto hidden sm:block">
            Contractor Compliance Portal
          </span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
