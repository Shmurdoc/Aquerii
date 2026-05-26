import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfileTab() {
  const user      = useAuthStore(s => s.user)
  const setUser   = useAuthStore(s => s.setUser)
  const [name, setName] = useState(user?.name ?? '')
  const fileRef   = useRef<HTMLInputElement>(null)

  const updateProfile = useMutation({
    mutationFn: (data: { name?: string; avatar_url?: string }) =>
      api.put('/me', data),
    onSuccess: res => {
      setUser(res.data.data)
      toast.success('Profile updated.')
    },
    onError: () => toast.error('Failed to update profile.'),
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('avatar', file)
      return api.post('/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: res => {
      setUser(res.data.data)
      toast.success('Avatar updated.')
    },
    onError: () => toast.error('Failed to upload avatar.'),
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    updateProfile.mutate({ name: name.trim() })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadAvatar.mutate(file)
  }

  if (!user) return null

  return (
    <div className="max-w-lg">
      <h2 className="text-sm font-semibold text-gray-300 mb-5">Profile</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative group">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold border-2 border-gray-700">
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploadAvatar.isPending
              ? <Loader2 size={16} className="text-white animate-spin" />
              : <Camera size={16} className="text-white" />
            }
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Display name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                       outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input
            value={user.email}
            disabled
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-gray-600 mt-1">Email changes are not supported yet.</p>
        </div>

        <button
          type="submit"
          disabled={updateProfile.isPending || !name.trim() || name === user.name}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {updateProfile.isPending && <Loader2 size={13} className="animate-spin" />}
          Save changes
        </button>
      </form>
    </div>
  )
}
