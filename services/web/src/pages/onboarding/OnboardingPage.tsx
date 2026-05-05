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

// ─── Step definitions ──────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const setWorkspace = useAuthStore(s => s.setWorkspace)

  const [step,       setStep]       = useState(0)
  const [role,       setRole]       = useState('')
  const [invites,    setInvites]    = useState<string[]>([''])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [color,      setColor]      = useState(PALETTE[0])

  const wsForm = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '', color: PALETTE[0] },
  })
  const boardForm = useForm<BoardForm>({
    resolver: zodResolver(boardSchema),
    defaultValues: { name: 'My First Board' },
  })

  // Create workspace
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

  // Invite members
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

  // Create first board
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">A</div>
          <span className="text-xl font-bold text-white">Aquerii</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-1 mb-8">
          <div
            className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator */}
        <p className="text-xs text-gray-500 text-center mb-2">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="text-2xl font-bold text-white text-center mb-1">
          {STEPS[step].title}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          {STEPS[step].description}
        </p>

        {/* ── Step 0: Workspace name ── */}
        {step === 0 && (
          <form onSubmit={wsForm.handleSubmit(d => createWorkspace.mutate(d))} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Workspace name</label>
              <input
                {...wsForm.register('name')}
                autoFocus
                placeholder="e.g. Acme Corp"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {wsForm.formState.errors.name && (
                <p className="text-xs text-red-400 mt-1">{wsForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Colour</label>
              <div className="flex gap-2">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={clsx(
                      'w-7 h-7 rounded-full transition-transform',
                      color === c && 'ring-2 ring-white ring-offset-2 ring-offset-gray-950 scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createWorkspace.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {createWorkspace.isPending ? 'Creating…' : 'Continue'}
            </button>
          </form>
        )}

        {/* ── Step 1: Role ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors',
                    role === r.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  )}
                >
                  <span className="text-xl">{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!role}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Continue
            </button>
            <button onClick={() => setStep(2)} className="w-full text-gray-600 text-sm hover:text-gray-400 transition-colors">
              Skip
            </button>
          </div>
        )}

        {/* ── Step 2: Invite ── */}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ))}
            <button
              type="button"
              onClick={() => setInvites(prev => [...prev, ''])}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              + Add another
            </button>
            <button
              onClick={() => inviteMembers.mutate(invites)}
              disabled={inviteMembers.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {inviteMembers.isPending ? 'Inviting…' : 'Send invites'}
            </button>
            <button onClick={() => setStep(3)} className="w-full text-gray-600 text-sm hover:text-gray-400 transition-colors">
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 3: First board ── */}
        {step === 3 && (
          <form onSubmit={boardForm.handleSubmit(d => createBoard.mutate(d))} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Board name</label>
              <input
                {...boardForm.register('name')}
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={createBoard.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {createBoard.isPending ? 'Creating…' : 'Create board & go →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
