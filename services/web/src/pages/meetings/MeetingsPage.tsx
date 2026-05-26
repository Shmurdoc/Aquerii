import { useState } from 'react'
import { Plus, X, Video, MapPin, Link, Calendar, Clock, Users, Check, Minus } from 'lucide-react'
import { useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting, useUpdateAttendance } from '@/hooks/useMeetings'
import { Meeting, CreateMeetingPayload, MeetingStatus, MeetingProvider } from '@/lib/meetings'
import { useAuthStore } from '@/stores/authStore'
import clsx from 'clsx'

const STATUSES: MeetingStatus[] = ['scheduled', 'ongoing', 'completed', 'cancelled']

const PROVIDER_ICONS: Record<MeetingProvider, string> = {
  zoom: 'Z',
  teams: 'T',
  google: 'G',
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

// ─── New Meeting Modal ─────────────────────────────────────────────────────────

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
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">New Meeting</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200"><X size={18} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Title *</label>
            <input required value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Description</label>
            <textarea value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Starts *</label>
              <input required type="datetime-local" value={form.starts_at ?? ''} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Ends *</label>
              <input required type="datetime-local" value={form.ends_at ?? ''} onChange={e => setForm({ ...form, ends_at: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Provider</label>
              <select value={form.provider ?? 'zoom'} onChange={e => setForm({ ...form, provider: e.target.value as MeetingProvider })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
                <option value="google">Google Meet</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Location</label>
              <input value={form.location ?? ''} onChange={e => setForm({ ...form, location: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Meeting URL</label>
            <input type="url" value={form.meeting_url ?? ''} onChange={e => setForm({ ...form, meeting_url: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Attendees</label>
            <div className="flex gap-2">
              <input value={attendeeInput} onChange={e => setAttendeeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                placeholder="Enter email and press Enter"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
              <button type="button" onClick={addAttendee}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Add</button>
            </div>
            {(form.attendees ?? []).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(form.attendees ?? []).map((a, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-gray-800 rounded px-2 py-0.5 text-gray-300">
                    {a.email}
                    <button type="button" onClick={() => setForm(f => ({ ...f, attendees: (f.attendees ?? []).filter((_, j) => j !== i) }))}
                      className="text-gray-600 hover:text-gray-300"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button type="submit" disabled={create.isPending}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Meeting'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function MeetingDetail({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const user = useAuthStore(s => s.user)
  const deleteMeeting = useDeleteMeeting()
  const updateMeeting = useUpdateMeeting()
  const updateAttendance = useUpdateAttendance()

  const myAttendance = meeting.attendees?.find(a => a.email === user?.email)
  const isPast = new Date(meeting.ends_at) < new Date()

  async function handleStatusChange(status: MeetingStatus) {
    await updateMeeting.mutateAsync({ id: meeting.id, payload: { status } })
  }

  async function handleRsvp(status: 'accepted' | 'declined' | 'tentative') {
    await updateAttendance.mutateAsync({ id: meeting.id, status })
  }

  return (
    <div className="w-96 border-l border-gray-800 bg-gray-900/60 overflow-y-auto flex flex-col shrink-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-100">Meeting Details</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-200"><X size={16} /></button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-100">{meeting.title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_LABEL[meeting.status].classes)}>
              {STATUS_LABEL[meeting.status].label}
            </span>
            <span className="text-[10px] text-gray-500">{meeting.provider.toUpperCase()}</span>
          </div>
        </div>

        {meeting.description && (
          <p className="text-xs text-gray-400 leading-relaxed">{meeting.description}</p>
        )}

        <div className="flex flex-col gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-gray-500 shrink-0" />
            {formatDate(meeting.starts_at)}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-gray-500 shrink-0" />
            {formatTime(meeting.starts_at)} – {formatTime(meeting.ends_at)}
            <span className="text-gray-600">({formatDuration(meeting.starts_at, meeting.ends_at)})</span>
          </div>
          {meeting.location && (
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-gray-500 shrink-0" />
              {meeting.location}
            </div>
          )}
          {meeting.meeting_url && (
            <div className="flex items-center gap-2">
              <Link size={13} className="text-gray-500 shrink-0" />
              <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 truncate">{meeting.meeting_url}</a>
            </div>
          )}
        </div>

        {meeting.organizer && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Users size={13} className="text-gray-500 shrink-0" />
            Organized by {meeting.organizer.name}
          </div>
        )}

        {/* RSVP */}
        {myAttendance && !isPast && meeting.status === 'scheduled' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-500">Your RSVP</span>
            <div className="flex gap-2">
              {(['accepted', 'tentative', 'declined'] as const).map(s => (
                <button key={s} onClick={() => handleRsvp(s)} disabled={updateAttendance.isPending}
                  className={clsx(
                    'text-xs px-3 py-1 rounded transition-colors',
                    myAttendance.status === s
                      ? s === 'accepted' ? 'bg-green-600 text-white' : s === 'tentative' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  )}>
                  {s === 'accepted' ? 'Yes' : s === 'tentative' ? 'Maybe' : 'No'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attendees */}
        {meeting.attendees && meeting.attendees.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-500">
              Attendees ({meeting.attendees.length})
            </span>
            <div className="flex flex-col gap-1">
              {meeting.attendees.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs text-gray-400 py-1">
                  <div className="flex items-center gap-2">
                    {a.status === 'accepted' ? <Check size={12} className="text-green-500" />
                      : a.status === 'declined' ? <Minus size={12} className="text-red-500" />
                      : <Clock size={12} className="text-gray-600" />}
                    <span>{a.name || a.email}</span>
                    {a.name && <span className="text-gray-600">{a.email}</span>}
                  </div>
                  {!a.required && <span className="text-[10px] text-gray-600">optional</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isPast && (
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            {meeting.status === 'scheduled' && (
              <button onClick={() => handleStatusChange('cancelled')} disabled={deleteMeeting.isPending}
                className="text-xs px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors">
                Cancel Meeting
              </button>
            )}
            <button onClick={() => { deleteMeeting.mutate(meeting.id); onClose() }} disabled={deleteMeeting.isPending}
              className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors ml-auto">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: meetings = [], isLoading } = useMeetings({
    status: statusFilter || undefined,
  })

  const selected = meetings.find(m => m.id === selectedId) ?? null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 shrink-0">
        <Video size={16} className="text-gray-500" />
        <h1 className="text-base font-semibold text-gray-100 mr-2">Meetings</h1>

        <div className="flex gap-1">
          {['', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx(
                'text-xs px-3 py-1 rounded transition-colors',
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              )}>
              {s === '' ? 'All' : STATUS_LABEL[s as MeetingStatus].label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={13} />
          New Meeting
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Video size={24} className="text-gray-700" />
              <p className="text-gray-500 text-sm">No meetings found</p>
              <button onClick={() => setShowNew(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Schedule your first meeting</button>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-2">
              {meetings.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={clsx(
                    'w-full text-left bg-gray-900 border rounded-xl p-4 transition-colors hover:border-indigo-500/40',
                    selectedId === m.id ? 'border-indigo-500/60' : 'border-gray-800'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-[11px] font-bold text-gray-400 shrink-0">
                          {PROVIDER_ICONS[m.provider]}
                        </div>
                        <h3 className="text-sm font-medium text-gray-100 truncate">{m.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(m.starts_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatTime(m.starts_at)}
                        </span>
                        <span className="text-gray-600">{formatDuration(m.starts_at, m.ends_at)}</span>
                      </div>
                      {m.attendees && m.attendees.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-600">
                          <Users size={11} />
                          {m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}
                          <span className="text-gray-700">·</span>
                          {m.attendees.filter(a => a.status === 'accepted').length} accepted
                        </div>
                      )}
                    </div>
                    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', STATUS_LABEL[m.status].classes)}>
                      {STATUS_LABEL[m.status].label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <MeetingDetail meeting={selected} onClose={() => setSelectedId(null)} />
        )}
      </div>

      {/* New Meeting Modal */}
      {showNew && <NewMeetingModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
