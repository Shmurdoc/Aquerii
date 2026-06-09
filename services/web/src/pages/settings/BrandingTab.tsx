import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function BrandingTab() {
  const workspace = useAuthStore(s => s.workspace)
  const setWorkspace = useAuthStore(s => s.setWorkspace)
  const workspaceId = workspace?.id

  const [color, setColor] = useState(workspace?.color || '#7c3aed')
  const [logoPreview, setLogoPreview] = useState<string | null>(workspace?.logo_url || null)

  const colorMutation = useMutation({
    mutationFn: async (newColor: string) => {
      const res = await api.patch(`/workspaces/${workspaceId}`, { color: newColor })
      return res.data.data
    },
    onSuccess: (data) => {
      setWorkspace({ ...workspace!, ...data })
      toast.success('Brand color updated')
    },
    onError: () => toast.error('Failed to update brand color'),
  })

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post(`/workspaces/${workspaceId}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data.data
    },
    onSuccess: (data) => {
      setWorkspace({ ...workspace!, logo_url: data.logo_url })
      toast.success('Logo uploaded')
    },
    onError: () => toast.error('Failed to upload logo'),
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    logoMutation.mutate(file)
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setColor(newColor)
    colorMutation.mutate(newColor)
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Logo</h3>
        <div className="mt-3 flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded object-cover" />
          ) : (
            <div className="w-16 h-16 rounded bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
              No logo
            </div>
          )}
          <label className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white px-3 py-2 rounded text-sm disabled:opacity-50">
            {logoMutation.isPending ? 'Uploading…' : 'Choose file'}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
              disabled={logoMutation.isPending}
            />
          </label>
        </div>
      </section>

      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Brand color</h3>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={handleColorChange}
            className="w-10 h-10 rounded cursor-pointer border border-gray-700"
          />
          <span className="text-sm text-gray-300">{color}</span>
          {colorMutation.isPending && (
            <span className="text-sm text-gray-400">Saving…</span>
          )}
        </div>
      </section>
    </div>
  )
}
