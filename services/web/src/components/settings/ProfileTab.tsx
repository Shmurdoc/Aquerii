import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateProfile } from '@/hooks/useSettings'
import { useNavigate } from 'react-router-dom'
import { settingsApi } from '@/lib/settings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ProfileTab() {
  const user = useAuthStore((s) => s.user)!
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user.name)
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.mfa_enabled)
  const [disableLoading, setDisableLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const updateProfile = useUpdateProfile()

  useEffect(() => {
    setTwoFactorEnabled(user.mfa_enabled)
  }, [user.mfa_enabled])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {}
    if (name !== user.name) payload.name = name
    if (password) {
      if (password.length < 8) return
      if (password !== confirmPw) return
      payload.password = password
      payload.password_confirmation = confirmPw
    }
    if (Object.keys(payload).length === 0) return
    await updateProfile.mutateAsync(payload)
    setPassword('')
    setConfirmPw('')
  }

  async function handleDisable() {
    if (!confirm('Disable two-factor authentication? Your account will be less secure.')) return
    setDisableLoading(true)
    try {
      await settingsApi.disableTwoFactor()
      setTwoFactorEnabled(false)
      toast.success('Two-factor authentication disabled')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to disable 2FA')
    } finally {
      setDisableLoading(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await api.post('/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const avatarUrl = res.data?.data?.avatar_url ?? res.data?.avatar_url
      if (avatarUrl) setUser({ ...user, avatar_url: avatarUrl })
      toast.success('Avatar updated')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Upload failed')
    } finally {
      setAvatarUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-100 mb-1">Profile</h2>
      <p className="text-xs text-gray-500 mb-6">Update your name and password.</p>

      <div className="mb-6">
        <label className="text-xs text-gray-500 block mb-2">Avatar</label>
        <div className="flex items-center gap-4">
          <Avatar
            src={user.avatar_url ?? undefined}
            name={user.name}
            size="xl"
            shape="circle"
          />
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={avatarUploading}
              loading={avatarUploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload Avatar
            </Button>
            <p className="text-[11px] text-gray-600">PNG, JPEG or WebP. Max 2 MB.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Input
          label="Email"
          value={user.email}
          disabled
          helperText="Email cannot be changed"
          size="md"
        />

        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="md"
        />

        <hr className="border-gray-800" />
        <p className="text-xs text-gray-500">Change password (leave blank to keep current)</p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="md"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            size="md"
          />
        </div>
        {password && password !== confirmPw && (
          <p className="text-xs text-red-400">Passwords do not match</p>
        )}
        {password && password.length < 8 && (
          <p className="text-xs text-red-400">Password must be at least 8 characters</p>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={updateProfile.isPending}
            loading={updateProfile.isPending}
          >
            Save Changes
          </Button>
        </div>
      </form>

      <hr className="border-gray-800 my-6" />
      <h3 className="text-base font-semibold text-gray-100 mb-1">Two-Factor Authentication</h3>
      <p className="text-xs text-gray-500 mb-4">Add an extra layer of security to your account.</p>

      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm text-gray-200 flex items-center gap-2">
              Status:
              <Badge variant={twoFactorEnabled ? 'success' : 'default'} size="sm" dot>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {twoFactorEnabled
                ? 'Your account is protected by two-factor authentication.'
                : 'Protect your account with an authenticator app.'}
            </p>
          </div>
        </div>
        {twoFactorEnabled ? (
          <Button
            variant="danger"
            size="sm"
            disabled={disableLoading}
            loading={disableLoading}
            onClick={handleDisable}
          >
            Disable
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/auth/2fa-setup')}
          >
            Enable
          </Button>
        )}
      </div>
    </div>
  )
}
