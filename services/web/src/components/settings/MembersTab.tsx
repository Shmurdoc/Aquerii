import { useState, useRef } from 'react'
import { Plus, X, Mail, Trash2, Copy, Check, Link } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useWorkspaceMembers, useInviteMember, useUpdateMemberRole, useRemoveMember,
} from '@/hooks/useSettings'
import { MemberRole, ROLES } from '@/lib/settings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

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
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const currentMember = members.find((m) => m.user_id === user?.id)
  const isOwner = currentMember?.role === 'owner'
  const isAdminOrOwner = (role: string) => role === 'admin' || role === 'owner'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole })
    setShowInvite(false)
    setInviteEmail('')
  }

  async function handleRemove() {
    if (!removeTarget) return
    await removeMember.mutateAsync(removeTarget.id)
    setRemoveTarget(null)
  }

  async function handleCopyInviteLink() {
    const link = `${window.location.origin}/join/${workspace?.slug}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const activeMembers   = members.filter((m) => m.status === 'active')
  const pendingMembers  = members.filter((m) => m.status === 'pending')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-100">Team</h2>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button onClick={() => setShowInvite(true)} size="sm" variant="primary">
              <Plus size={13} /> Invite Member
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-6">{members.length} member{members.length !== 1 ? 's' : ''}</p>

      {showInvite && (
        <form onSubmit={handleInvite} className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">Invite by email</span>
            <button type="button" onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-gray-200"><X size={14} /></button>
          </div>
          <div className="flex gap-2">
            <Input
              required
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              size="sm"
              containerClassName="flex-1"
            />
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              size="sm"
              containerClassName="w-32"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
            <Button type="submit" size="sm" variant="primary" disabled={inviteMember.isPending} loading={inviteMember.isPending}>
              Invite
            </Button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Button size="sm" variant="ghost" onClick={handleCopyInviteLink}>
          {copied ? <Check size={13} /> : <Link size={13} />}
          {copied ? 'Copied' : 'Copy Invite Link'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold px-1">
              Active ({activeMembers.length})
            </p>
            {activeMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 bg-gray-800/30 border border-gray-800 rounded-lg px-4 py-3 group">
                <Avatar
                  src={member.avatar_url ?? undefined}
                  name={member.name}
                  size="sm"
                  shape="circle"
                  presence="online"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">
                    {member.name}
                    {member.user_id === user?.id && <span className="text-gray-500 text-xs ml-2">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>

                {(isOwner || isAdminOrOwner(currentMember?.role ?? '')) && member.user_id !== user?.id ? (
                  <Select
                    value={member.role}
                    onChange={(e) => updateRole.mutate({ userId: member.user_id, role: e.target.value as MemberRole })}
                    size="sm"
                    containerClassName="w-28"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value} title={r.description}>{r.label}</option>
                    ))}
                  </Select>
                ) : (
                  <Badge variant="primary" size="sm">
                    {member.role}
                  </Badge>
                )}

                {isOwner && member.user_id !== user?.id && (
                  <button onClick={() => setRemoveTarget({ id: member.user_id, name: member.name })}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

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
                  <Badge variant="warning" size="sm">Pending</Badge>
                  {isOwner && (
                    <button onClick={() => setRemoveTarget({ id: member.user_id, name: member.email })}
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

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Member"
        description={`Are you sure you want to remove ${removeTarget?.name ?? 'this member'}? This action cannot be undone.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleRemove} loading={removeMember.isPending}>
              Remove
            </Button>
          </>
        }
      />
    </div>
  )
}
