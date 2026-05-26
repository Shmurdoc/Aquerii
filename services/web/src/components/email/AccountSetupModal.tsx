/**
 * AccountSetupModal — add a new IMAP/SMTP email account.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAccount } from '@/lib/email'
import { X, Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  workspaceId: string
  onClose: () => void
}

export default function AccountSetupModal({ workspaceId, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email_address: '',
    imap_host: '',
    imap_port: '993',
    imap_ssl: true,
    imap_username: '',
    imap_password: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
  })

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () => createAccount(workspaceId, {
      name: form.name,
      email_address: form.email_address,
      imap_host: form.imap_host,
      imap_port: parseInt(form.imap_port),
      imap_ssl: form.imap_ssl,
      imap_username: form.imap_username,
      imap_password: form.imap_password,
      smtp_host: form.smtp_host || undefined,
      smtp_port: form.smtp_port ? parseInt(form.smtp_port) : undefined,
      smtp_username: form.smtp_username || undefined,
      smtp_password: form.smtp_password || undefined,
    }),
    onSuccess: () => {
      toast.success('Account added. Syncing inbox…')
      qc.invalidateQueries({ queryKey: ['email-accounts', workspaceId] })
      onClose()
    },
    onError: () => toast.error('Failed to save account.'),
  })

  const canSave = form.name && form.email_address && form.imap_host && form.imap_username && form.imap_password

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
            <Mail size={16} className="text-indigo-400" />
            <p className="flex-1 text-sm font-semibold text-white">Add Email Account</p>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="overflow-auto p-5 space-y-4">
            <Field label="Account name" value={form.name} onChange={v => set('name', v)} placeholder="Work Email" />
            <Field label="Email address" value={form.email_address} onChange={v => set('email_address', v)} placeholder="you@example.com" type="email" />

            <p className="text-xs text-gray-500 font-medium pt-1 uppercase tracking-wide">IMAP (Incoming)</p>
            <Field label="IMAP host" value={form.imap_host} onChange={v => set('imap_host', v)} placeholder="imap.gmail.com" />
            <div className="flex gap-3">
              <Field label="Port" value={form.imap_port} onChange={v => set('imap_port', v)} placeholder="993" className="w-24" />
              <label className="flex items-center gap-2 text-xs text-gray-400 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.imap_ssl}
                  onChange={e => set('imap_ssl', e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-500"
                />
                SSL
              </label>
            </div>
            <Field label="Username" value={form.imap_username} onChange={v => set('imap_username', v)} placeholder="you@example.com" />
            <Field label="Password" value={form.imap_password} onChange={v => set('imap_password', v)} placeholder="••••••••" type="password" />

            <p className="text-xs text-gray-500 font-medium pt-1 uppercase tracking-wide">SMTP (Outgoing, optional)</p>
            <Field label="SMTP host" value={form.smtp_host} onChange={v => set('smtp_host', v)} placeholder="smtp.gmail.com" />
            <div className="flex gap-3">
              <Field label="Port" value={form.smtp_port} onChange={v => set('smtp_port', v)} placeholder="587" className="w-24" />
            </div>
            <Field label="Username" value={form.smtp_username} onChange={v => set('smtp_username', v)} placeholder="you@example.com" />
            <Field label="Password" value={form.smtp_password} onChange={v => set('smtp_password', v)} placeholder="••••••••" type="password" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={!canSave || save.isPending}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              Save Account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}
