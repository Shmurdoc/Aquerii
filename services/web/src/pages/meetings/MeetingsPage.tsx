import { useState } from 'react'
import { Plus, X, Video, MapPin, Link, Calendar, Clock, Users, Check, Minus, Star } from 'lucide-react'
import { useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting, useUpdateAttendance } from '@/hooks/useMeetings'
import { Meeting, CreateMeetingPayload, MeetingStatus, MeetingProvider } from '@/lib/meetings'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import clsx from 'clsx'
import { Button, Input, Modal } from '@/components/ui'
import { JitsiMeeting } from '@/components/meetings/JitsiMeeting'

const STATUSES: MeetingStatus[] = ['scheduled', 'ongoing', 'completed', 'cancelled']

const PROVIDER_ICONS: Record<MeetingProvider, string> = {
  zoom: 'Z',
  teams: 'T',
  google: 'G',
  jitsi: '📹',
  other: 'V',
}

const STATUS_LABEL: Record<MeetingStatus, { label: string; classes: string }> = {
  scheduled: { label: 'Scheduled', classes: 'bg-blue-500/20 text-blue-400' },
  ongoing:   { label: 'Ongoing',   classes: 'bg-green-500/20 text-green-400' },
  completed: { label: 'Completed', classes: 'bg-gray-500/20 text-gray-400' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-500/20 text-red-400' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function emptyForm(): Partial<CreateMeetingPayload> {
  const now = new Date()
  const start = new Date(now.getTime() + 3600000)
  const end = new Date(start.getTime() + 3600000)
  return {
    title: '',
    description: '',
    location: '',
    meeting_url: '',
    starts_at: start.toISOString().slice(0, 16),
    ends_at: end.toISOString().slice(0, 16),
    provider: 'zoom',
    attendees: [],
  }
}

function NewMeetingModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Partial<CreateMeetingPayload>>(emptyForm)
  const [attendeeInput, setAttendeeInput] = useState('')
  const create = useCreateMeeting()

  function addAttendee() {
    const email = attendeeInput.trim()
    if (!email) return
    setForm(f => ({
      ...f,
      attendees: [...(f.attendees ?? []), { email, required: true }],
    }))
    setAttendeeInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title?.trim()) return
    await create.mutateAsync(form as CreateMeetingPayload)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
        style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-glass-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>New Meeting</h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Title *</label>
            <input required value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })}
              className="rounded px-2 py-1.5 text-sm outline-none"
              style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Description</label>
            <textarea value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="rounded px-2 py-1.5 text-sm resize-none outline-none"
              style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Starts *</label>
              <input required type="datetime-local" value={form.starts_at ?? ''} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                className="rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ends *</label>
              <input required type="datetime-local" value={form.ends_at ?? ''} onChange={e => setForm({ ...form, ends_at: e.target.value })}
                className="rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Provider</label>
              <select value={form.provider ?? 'zoom'} onChange={e => setForm({ ...form, provider: e.target.value as MeetingProvider })}
                className="rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }}>
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
                <option value="google">Google Meet</option>
                <option value="jitsi">Jitsi Meet (Built-in)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Location</label>
              <input value={form.location ?? ''} onChange={e => setForm({ ...form, location: e.target.value })}
                className="rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Meeting URL</label>
            <input type="url" value={form.meeting_url ?? ''} onChange={e => setForm({ ...form, meeting_url: e.target.value })}
              className="rounded px-2 py-1.5 text-sm outline-none"
              style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Attendees</label>
            <div className="flex gap-2">
              <input value={attendeeInput} onChange={e => setAttendeeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                placeholder="Enter email and press Enter"
                className="flex-1 rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }} />
              <Button size="sm" type="button" onClick={addAttendee}>Add</Button>
            </div>
            {(form.attendees ?? []).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(form.attendees ?? []).map((a, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs rounded px-2 py-0.5"
                    style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
                    {a.email}
                    <button type="button" onClick={() => setForm(f => ({ ...f, attendees: (f.attendees ?? []).filter((_, j) => j !== i) }))}
                      className="hover:opacity-70" style={{ color: 'var(--color-text-muted)' }}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-glass-border)' }}>
          <Button size="sm" variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Meeting'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function MeetingDetail({ meeting, onClose, onJoin }: { meeting: Meeting; onClose: () => void; onJoin: (id: string) => void }) {
  const user = useAuthStore(s => s.user)
  const updateAttendance = useUpdateAttendance()
  const deleteMeeting = useDeleteMeeting()
  const [effectiveness, setEffectiveness] = useState<number | null>(null)
  const [decisions, setDecisions] = useState('')
  const [actionItems, setActionItems] = useState('')
  const [savingOutcome, setSavingOutcome] = useState(false)

  const myAttendance = meeting.attendees?.find(a => a.email === user?.email)
  const isPast = new Date(meeting.ends_at) < new Date()

  function handleRsvp(status: 'accepted' | 'tentative' | 'declined') {
    updateAttendance.mutate({ id: meeting.id, status })
  }

  function handleStatusChange(status: MeetingStatus) {
    deleteMeeting.mutate(meeting.id)
  }

  function handleJoin() {
    if (meeting.provider === 'jitsi') {
      onJoin(meeting.id)
    } else if (meeting.meeting_url) {
      window.open(meeting.meeting_url, '_blank')
    }
  }

  async function handleSaveOutcome() {
    if (!effectiveness) return
    setSavingOutcome(true)
    try {
      const workspace = useAuthStore.getState().workspace
      await api.post(`/workspaces/${workspace?.id}/meetings/${meeting.id}/outcome`, {
        effectiveness_score: effectiveness,
        decisions: decisions ? decisions.split('\n').filter(Boolean) : [],
        action_items: actionItems ? actionItems.split('\n').filter(Boolean).map(text => ({ text })) : [],
      })
    } catch {
      // non-fatal
    }
    setSavingOutcome(false)
  }

  return (
    <div className="w-96 border-l overflow-y-auto flex flex-col shrink-0"
      style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-base)' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Meeting Details</h2>
        <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{meeting.title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_LABEL[meeting.status].classes)}>
              {STATUS_LABEL[meeting.status].label}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{meeting.provider.toUpperCase()}</span>
          </div>
        </div>

        {meeting.description && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{meeting.description}</p>
        )}

        <div className="flex flex-col gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            {formatDate(meeting.starts_at)}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={13} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            {formatTime(meeting.starts_at)} – {formatTime(meeting.ends_at)}
            <span style={{ color: 'var(--color-text-muted)' }}>({formatDuration(meeting.starts_at, meeting.ends_at)})</span>
          </div>
          {meeting.location && (
            <div className="flex items-center gap-2">
              <MapPin size={13} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              {meeting.location}
            </div>
          )}
          {meeting.meeting_url && (
            <div className="flex items-center gap-2">
              <Link size={13} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer"
                className="truncate" style={{ color: 'var(--color-accent-text)' }}>{meeting.meeting_url}</a>
            </div>
          )}
        </div>

        {meeting.organizer && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Users size={13} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            Organized by {meeting.organizer.name}
          </div>
        )}

        {myAttendance && !isPast && meeting.status === 'scheduled' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Your RSVP</span>
            <div className="flex gap-2">
              {(['accepted', 'tentative', 'declined'] as const).map(s => (
                <button key={s} onClick={() => handleRsvp(s)} disabled={updateAttendance.isPending}
                  className={clsx(
                    'text-xs px-3 py-1 rounded transition-colors',
                  )}
                  style={myAttendance.status === s
                    ? s === 'accepted' ? { background: '#16a34a', color: '#fff' } : s === 'tentative' ? { background: '#ca8a04', color: '#fff' } : { background: '#dc2626', color: '#fff' }
                    : { background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }
                  }>
                  {s === 'accepted' ? 'Yes' : s === 'tentative' ? 'Maybe' : 'No'}
                </button>
              ))}
            </div>
          </div>
        )}

        {meeting.attendees && meeting.attendees.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Attendees ({meeting.attendees.length})
            </span>
            <div className="flex flex-col gap-1">
              {meeting.attendees.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs py-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    {a.status === 'accepted' ? <Check size={12} style={{ color: 'var(--color-status-success)' }} />
                      : a.status === 'declined' ? <Minus size={12} style={{ color: 'var(--color-status-blocked)' }} />
                      : <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />}
                    <span>{a.name || a.email}</span>
                    {a.name && <span style={{ color: 'var(--color-text-muted)' }}>{a.email}</span>}
                  </div>
                  {!a.required && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>optional</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isPast && (
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
            {meeting.status === 'scheduled' && (
              <>
                <Button size="sm" onClick={handleJoin} className="gap-2">
                  <Video size={13} /> Join Meeting
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleStatusChange('cancelled')} disabled={deleteMeeting.isPending}>
                  Cancel
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => { deleteMeeting.mutate(meeting.id); onClose() }} disabled={deleteMeeting.isPending} className="!ml-auto">
              Delete
            </Button>
          </div>
        )}

        {/* Effectiveness scoring for past meetings */}
        {isPast && meeting.status === 'completed' && (
          <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--color-glass-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Meeting Effectiveness</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setEffectiveness(star)} className="transition-colors">
                  <Star
                    size={20}
                    className={clsx(
                      effectiveness && star <= effectiveness
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600',
                    )}
                  />
                </button>
              ))}
            </div>

            {effectiveness && (
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Decisions made</label>
                  <textarea
                    value={decisions}
                    onChange={e => setDecisions(e.target.value)}
                    placeholder="One decision per line"
                    rows={2}
                    className="rounded px-2 py-1.5 text-xs resize-none outline-none"
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Action items</label>
                  <textarea
                    value={actionItems}
                    onChange={e => setActionItems(e.target.value)}
                    placeholder="One action item per line"
                    rows={2}
                    className="rounded px-2 py-1.5 text-xs resize-none outline-none"
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <Button size="sm" onClick={handleSaveOutcome} disabled={savingOutcome}>
                  {savingOutcome ? 'Saving…' : 'Save Outcome'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MeetingsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [joinMeetingId, setJoinMeetingId] = useState<string | null>(null)

  const { data: meetings = [], isLoading } = useMeetings({
    status: statusFilter || undefined,
  })

  const user = useAuthStore(s => s.user)
  const selected = meetings.find(m => m.id === selectedId) ?? null
  const joinMeeting = meetings.find(m => m.id === joinMeetingId) ?? null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-glass-border)' }}>
        <Video size={16} style={{ color: 'var(--color-text-muted)' }} />
        <h1 className="text-base font-semibold mr-2" style={{ color: 'var(--color-text-primary)' }}>Meetings</h1>

        <div className="flex gap-1">
          {['', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx(
                'text-xs px-3 py-1 rounded transition-colors',
              )}
              style={statusFilter === s
                ? { background: 'var(--color-accent)', color: '#fff' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }
              }>
              {s === '' ? 'All' : STATUS_LABEL[s as MeetingStatus].label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus size={13} />
          New Meeting
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Video size={24} className="opacity-50" />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No meetings found</p>
              <button onClick={() => setShowNew(true)} className="text-xs" style={{ color: 'var(--color-accent-text)' }}>Schedule your first meeting</button>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-2">
              {meetings.map(m => (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(m.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedId(m.id)
                    }
                  }}
                  className="w-full text-left rounded-xl p-4 transition-colors cursor-pointer"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: selectedId === m.id
                      ? '1px solid var(--color-accent)'
                      : '1px solid var(--color-glass-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
                          {PROVIDER_ICONS[m.provider]}
                        </div>
                        <h3 className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{m.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(m.starts_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatTime(m.starts_at)}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{formatDuration(m.starts_at, m.ends_at)}</span>
                      </div>
                      {m.attendees && m.attendees.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          <Users size={11} />
                          {m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}
                          <span className="mx-1" style={{ color: 'var(--color-glass-border)' }}>·</span>
                          {m.attendees.filter(a => a.status === 'accepted').length} accepted
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_LABEL[m.status].classes)}
                        style={{ background: `var(--color-bg-hover)` }}>
                        {STATUS_LABEL[m.status].label}
                      </span>
                      {m.status === 'scheduled' && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={e => {
                            e.stopPropagation()
                            if (m.provider === 'jitsi') {
                              setJoinMeetingId(m.id)
                            } else if (m.meeting_url) {
                              window.open(m.meeting_url, '_blank')
                            }
                          }}
                        >
                          <Video size={12} /> Join
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <MeetingDetail
            meeting={selected}
            onClose={() => setSelectedId(null)}
            onJoin={id => setJoinMeetingId(id)}
          />
        )}
      </div>

      {showNew && <NewMeetingModal onClose={() => setShowNew(false)} />}

      <Modal
        open={!!joinMeeting}
        onClose={() => setJoinMeetingId(null)}
        size="full"
        title={joinMeeting?.title}
        description={joinMeeting ? `Room: aquerii-${joinMeeting.id}` : undefined}
        closeOnOutsideClick={false}
        className="h-[85vh]"
      >
        {joinMeeting && (
          <div className="h-[70vh] -mx-5 -mb-3">
            <JitsiMeeting
              meetingId={joinMeeting.id}
              roomName={`aquerii-${joinMeeting.id}`}
              displayName={user?.name ?? 'Guest'}
              email={user?.email}
              onEnd={() => setJoinMeetingId(null)}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
