import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from './Button'
import type { ButtonProps } from './Button'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type ExportFormat = 'xlsx' | 'csv' | 'json'

type ExportButtonProps = Omit<ButtonProps, 'children' | 'onClick'> & {
  entity: string
  label?: string
  formats?: ExportFormat[]
}

export function ExportButton({ entity, label, formats = ['xlsx', 'csv'], variant = 'secondary', size = 'sm', className, ...props }: ExportButtonProps) {
  const workspaceId = useAuthStore(s => s.workspace?.id)
  const [format, setFormat] = useState<ExportFormat>(formats[0])
  const [open, setOpen] = useState(false)

  const handleExport = async (fmt: ExportFormat) => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/exports/${entity}/${fmt}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${entity}.${fmt}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${entity} exported as ${fmt.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button variant={variant} size={size} onClick={() => setOpen(!open)} className={className} {...props}>
        <Download size={size === 'xs' ? 12 : 14} />
        {label ?? entity}
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
          {formats.map(f => (
            <button key={f} onClick={() => handleExport(f)}
              className="block w-full text-left px-3 py-1.5 text-sm text-white hover:bg-gray-700 whitespace-nowrap"
            >
              Export as .{f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
