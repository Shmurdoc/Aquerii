import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Button, Input } from '@/components/ui'

const STEPS = [
  { id: 'workspace', title: 'Name your workspace',   description: 'This is how your team will see it.' },
  { id: 'role',      title: 'What best describes you?', description: 'We\'ll customise your experience.' },
  { id: 'invite',    title: 'Invite your team',       description: 'Add colleagues — they\'ll get an email invite.' },
  { id: 'board',     title: 'Create your first board', description: 'A board organises your work into groups and items.' },
]

const ROLES = [
  { value: 'engineering',  label: 'Engineering',  emoji: '⚙️' },
  { value: 'product',      label: 'Product',       emoji: '🧩' },
  { value: 'design',       label: 'Design',        emoji: '🎨' },
  { value: 'marketing',    label: 'Marketing',     emoji: '📣' },
  { value: 'sales',        label: 'Sales',         emoji: '💼' },
  { value: 'operations',   label: 'Operations',    emoji: '🏗️' },
  { value: 'other',        label: 'Other',         emoji: '✨' },
]

const workspaceSchema = z.object({
  name:  z.string().min(2).max(100),
  color: z.string().optional(),
})
const boardSchema = z.object({
  name: z.string().min(1).max(100),
})

type WorkspaceForm = z.infer<typeof workspaceSchema>
type BoardForm     = z.infer<typeof boardSchema>

const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#14b8a6']

export default function OnboardingPage() {
  const navigate = useNavigate()
  const setWorkspace = useAuthStore(s => s.setWorkspace)
  const existingWorkspace = useAuthStore(s => s.workspace)

  const initialStep = existingWorkspace ? 1 : 0

  const [step,       setStep]       = useState(initialStep)
  const [role,       setRole]       = useState('')
  const [invites,    setInvites]    = useState<string[]>([''])
  const [workspaceId, setWorkspaceId] = useState<string | null>(existingWorkspace?.id ?? null)
  const [color,      setColor]      = useState(PALETTE[0])

  const wsForm = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '', color: PALETTE[0] },
  })
  const boardForm = useForm<BoardForm>({
    resolver: zodResolver(boardSchema),
    defaultValues: { name: 'My First Board' },
  })

  const createWorkspace = useMutation({
    mutationFn: (data: WorkspaceForm) => api.post('/workspaces', { ...data, color }),
    onSuccess: (res) => {
      const ws = res.data.data
      setWorkspaceId(ws.id)
      setWorkspace(ws)
      setStep(1)
    },
    onError: () => toast.error('Failed to create workspace.'),
  })

  const inviteMembers = useMutation({
    mutationFn: async (emails: string[]) => {
      const valid = emails.filter(e => e.trim() && e.includes('@'))
      await Promise.allSettled(
        valid.map(email =>
          api.post(`/workspaces/${workspaceId}/members`, { email, role: 'member' })
        )
      )
    },
    onSettled: () => setStep(3),
  })

  const createBoard = useMutation({
    mutationFn: (data: BoardForm) =>
      api.post(`/workspaces/${workspaceId}/boards`, data),
    onSuccess: (res) => {
      navigate(`/boards/${res.data.data.id}`)
    },
    onError: () => toast.error('Failed to create board.'),
  })

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg-deepest)' }}>
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--color-accent)' }}>A</div>
          <span className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Aquerii</span>
        </div>

        <div className="w-full rounded-full h-1 mb-8" style={{ background: 'var(--color-bg-hover)' }}>
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--color-accent)' }}
          />
        </div>

        <p className="text-xs text-center mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {STEPS[step].title}
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--color-text-muted)' }}>
          {STEPS[step].description}
        </p>

        {step === 0 && (
          <form onSubmit={wsForm.handleSubmit(d => createWorkspace.mutate(d))} className="space-y-5">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>Workspace name</label>
              <Input
                {...wsForm.register('name')}
                autoFocus
                placeholder="e.g. Acme Corp"
                className="!w-full !rounded-xl !px-4 !py-3"
              />
              {wsForm.formState.errors.name && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-status-blocked)' }}>{wsForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>Colour</label>
              <div className="flex gap-2">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={clsx(
                      'w-7 h-7 rounded-full transition-transform',
                      color === c && 'ring-2 ring-white ring-offset-2 scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" disabled={createWorkspace.isPending} className="!w-full !rounded-xl !py-3">
              {createWorkspace.isPending ? 'Creating…' : 'Continue'}
            </Button>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors',
                  )}
                  style={role === r.value
                    ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent-light)', color: 'var(--color-text-primary)' }
                    : { borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)' }
                  }
                >
                  <span className="text-xl">{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(2)} disabled={!role} className="!w-full !rounded-xl !py-3">
              Continue
            </Button>
            <button onClick={() => setStep(2)} className="w-full text-sm transition-colors" style={{ color: 'var(--color-text-muted)' }}>
              Skip
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {invites.map((email, i) => (
              <input
                key={i}
                value={email}
                onChange={e => {
                  const next = [...invites]
                  next[i] = e.target.value
                  setInvites(next)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setInvites(prev => [...prev, ''])
                  }
                }}
                placeholder={`teammate@company.com`}
                type="email"
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{
                  background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setInvites(prev => [...prev, ''])}
              className="text-xs"
              style={{ color: 'var(--color-accent-text)' }}
            >
              + Add another
            </button>
            <Button onClick={() => inviteMembers.mutate(invites)} disabled={inviteMembers.isPending} className="!w-full !rounded-xl !py-3">
              {inviteMembers.isPending ? 'Inviting…' : 'Send invites'}
            </Button>
            <button onClick={() => setStep(3)} className="w-full text-sm transition-colors" style={{ color: 'var(--color-text-muted)' }}>
              Skip for now
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={boardForm.handleSubmit(d => createBoard.mutate(d))} className="space-y-5">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>Board name</label>
              <Input
                {...boardForm.register('name')}
                autoFocus
                className="!w-full !rounded-xl !px-4 !py-3"
              />
            </div>
            <Button type="submit" disabled={createBoard.isPending} className="!w-full !rounded-xl !py-3">
              {createBoard.isPending ? 'Creating…' : 'Create board & go →'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
