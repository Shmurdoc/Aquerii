import { Outlet, Navigate, Link } from 'react-router-dom'
import { Sparkles, Shield, Activity, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useBranding } from '@/contexts/BrandingContext'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import { staggerStyle } from '@/lib/motion'

export default function AuthLayout() {
  const token    = useAuthStore(s => s.token)
  const branding = useBranding()

  if (token) return <Navigate to="/boards" replace />

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[var(--color-bg-deepest)] text-[var(--color-text-primary)]">
      {/* Left — form pane */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 ambient-mesh opacity-50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--color-accent)]/15 blur-3xl animate-orb-drift-slow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[var(--row-9)]/15 blur-3xl animate-orb-drift"
        />
        <div className="relative w-full max-w-md">
          <div className="mb-8 flex flex-col items-center md:items-start">
            {branding.isDefault ? (
              <>
                <div
                  className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-md text-white shadow-[var(--shadow-elevated)]"
                  style={{ background: 'var(--gradient-accent)' }}
                  aria-hidden="true"
                >
                  <Sparkles size={22} />
                </div>
                <h1 className="text-display-sm font-bold tracking-tight gradient-text">
                  Aquerii
                </h1>
                <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
                  Work that flows.
                </p>
              </>
            ) : branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.name} className="h-12 object-contain mb-3" />
            ) : (
              <InitialsAvatar name={branding.name} color={branding.color} size={48} shape="rounded" />
            )}
            {!branding.isDefault && (
              <h1 className="mt-3 text-xl font-semibold">Welcome to {branding.name}</h1>
            )}
          </div>

          <div
            className="rounded-md p-7 sm:p-8 border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] backdrop-blur-xl shadow-[var(--shadow-elevated)] animate-modal-in"
          >
            <Outlet />
          </div>

          <p className="text-label text-[var(--color-text-muted)] mt-6 text-center md:text-left">
            By continuing you agree to our{' '}
            <Link to="/terms" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Right — cinematic brand pane (hidden on mobile) */}
      <div
        className="hidden md:flex relative overflow-hidden border-l border-[var(--color-glass-border)]"
        style={{ background: 'var(--gradient-accent-soft)' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 ambient-mesh"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-[var(--color-accent)]/30 blur-3xl animate-orb-drift-slow"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--row-9)]/25 blur-3xl animate-orb-drift"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <p className="text-micro font-semibold uppercase tracking-widest text-[var(--color-accent-text)]">
              The operating system for ambitious teams
            </p>
            <h2 className="mt-3 text-display-md font-bold tracking-tight text-[var(--color-text-primary)] max-w-md">
              Projects, CRM, ERP, and AI — in one cinematic surface.
            </h2>
            <p className="mt-3 text-body text-[var(--color-text-secondary)] max-w-md">
              Boards, pipelines, invoices, safety, support. Everything wired into one fast,
              keyboard-driven workspace. No tab graveyard.
            </p>
          </div>

          <ul className="grid gap-3 max-w-md">
            {[
              { icon: Activity, label: 'Realtime collaboration across every record' },
              { icon: Users,     label: 'Workspaces, roles, and field permissions' },
              { icon: Shield,    label: 'Audit logs, MFA, and SSO on every plan' },
            ].map((feat, i) => (
              <li
                key={feat.label}
                style={staggerStyle(i)}
                className="stagger-item flex items-center gap-3 px-4 py-3 rounded-md bg-[var(--color-bg-base)]/40 border border-[var(--color-glass-border)] backdrop-blur-sm"
              >
                <span
                  className="w-9 h-9 rounded-md inline-flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}
                  aria-hidden="true"
                >
                  <feat.icon size={16} />
                </span>
                <span className="text-body-sm text-[var(--color-text-primary)]">
                  {feat.label}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-label text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} Aquerii
          </p>
        </div>
      </div>
    </div>
  )
}
