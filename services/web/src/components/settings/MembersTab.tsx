import { useState } from 'react'
import { Plus, X, Mail, Shield, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useWorkspaceMembers, useInviteMember, useUpdateMemberRole, useRemoveMember,
} from '@/hooks/useSettings'
import { MemberRole, ROLES } from '@/lib/settings'

export default function MembersTab() {
  const user      = useAuthStore((s) => s.user)
  const workspace = useAuthStore((s) => s.workspace)

  const { data: members = [], isLoading }  = useWorkspaceMembers()
  const inviteMember                        = useInviteMember()
  const updateRole                          = useUpdateMemberRole()
  const removeMember                        = useRemoveMember()

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<MemberRole>('member')

  const isOwner = members.find((m) => m.user_id === user?.id)?.role === 'owner'
  const isAdminOrOwner = (role: string) => role === 'admin' || role === 'owner'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole })
    setShowInvite(false)
    setInviteEmail('')
  }

  const activeMembers   = members.filter((m) => m.status === 'active')
  const pendingMembers  = members.filter((m) => m.status === 'pending')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-100">Team</h2>
        {isOwner && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus size={13} />Invite Member
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-6">{members.length} member{members.length !== 1 ? 's' : ''}</p>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">Invite by email</span>
            <button type="button" onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-gray-200"><X size={14} /></button>
          </div>
          <div className="flex gap-2">
            <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button type="submit" disabled={inviteMember.isPending}
              className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 whitespace-nowrap">
              {inviteMember.isPending ? 'Sending…' : 'Invite'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Active members */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-1">
              Active ({activeMembers.length})
            </p>
            {activeMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 bg-gray-800/30 border border-gray-800 rounded-lg px-4 py-3 group">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-bold flex-shrink-0">
                  {member.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">
                    {member.name}
                    {member.user_id === user?.id && <span className="text-gray-500 text-xs ml-2">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>

                {/* Role selector */}
                {(isOwner || isAdminOrOwner(members.find((m) => m.user_id === user?.id)?.role ?? '')) && member.user_id !== user?.id ? (
                  <select value={member.role} onChange={(e) => updateRole.mutate({ userId: member.user_id, role: e.target.value as MemberRole })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-400/10 text-indigo-400 capitalize">
                    {member.role}
                  </span>
                )}

                {/* Remove */}
                {isOwner && member.user_id !== user?.id && (
                  <button onClick={() => removeMember.mutate(member.user_id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pending invitations */}
          {pendingMembers.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-1">
                Pending ({pendingMembers.length})
              </p>
              {pendingMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 bg-gray-800/20 border border-dashed border-gray-700 rounded-lg px-4 py-3">
                  <Mail size={14} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 truncate">{member.email}</p>
                    <p className="text-xs text-gray-600">Invitation pending</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400">Pending</span>
                  {isOwner && (
                    <button onClick={() => removeMember.mutate(member.user_id)}
                      className="text-gray-500 hover:text-red-400">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
