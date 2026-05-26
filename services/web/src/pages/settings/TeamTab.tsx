import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

type Member = {
  id: string
  user_id: string
  name?: string
  email: string
  role: string
  avatar_url?: string
}

export default function TeamTab() {
  const qc = useQueryClient()
  const workspace = useAuthStore(s => s.workspace)
  const workspaceId = workspace?.id

  const { data, isLoading } = useQuery({
    queryKey: ['workspace', workspaceId, 'members'],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`)
      return res.data.data as Member[]
    },
    enabled: !!workspaceId,
  })

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) =>
      api.post(`/workspaces/${workspaceId}/members`, payload),
    onSuccess: () => {
      toast.success('Member invited')
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'members'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to invite user'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role }),
    onSuccess: () => {
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'members'] })
    },
    onError: () => toast.error('Failed to update role'),
  })

  const removeMutation = useMutation({
    mutationFn: async (userId: string) =>
      api.delete(`/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => {
      toast.success('Member removed')
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'members'] })
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('Email is required')
    inviteMutation.mutate({ email, role })
    setEmail('')
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Invite member</h3>
        <form onSubmit={onInvite} className="flex gap-2 mt-3">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 text-sm text-white"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded text-sm"
          >
            {inviteMutation.isPending ? 'Inviting…' : 'Invite'}
          </button>
        </form>
        {inviteMutation.isError && (
          <div className="text-red-400 text-sm mt-2">Failed to invite user.</div>
        )}
      </section>

      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Members</h3>
        <div className="mt-4 space-y-3">
          {isLoading && <div className="text-gray-400">Loading…</div>}
          {!isLoading && (!data || data.length === 0) && (
            <div className="text-gray-400">No members yet.</div>
          )}
          {data && data.map((m: Member) => (
            <div key={m.user_id} className="flex items-center justify-between gap-4 border-b border-gray-800 pb-2">
              <div className="flex items-center gap-3">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.name ?? m.email} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-medium text-white">
                    {(m.name ?? m.email)[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">{m.name || m.email}</div>
                  <div className="text-sm text-gray-400">{m.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={m.role}
                  onChange={(e) => updateMutation.mutate({ userId: m.user_id, role: e.target.value })}
                  disabled={m.role === 'owner'}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white disabled:opacity-50"
                >
                  <option value="owner" disabled>Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.name ?? m.email} from the workspace?`)) {
                        removeMutation.mutate(m.user_id)
                      }
                    }}
                    disabled={removeMutation.isPending}
                    className="text-red-400 text-sm px-2 py-1 hover:text-red-300 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
