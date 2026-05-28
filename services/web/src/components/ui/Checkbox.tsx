import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, Props>(
  ({ label, className = '', ...props }, ref) => (
    <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      <input ref={ref} type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0" {...props} />
      {label && <span className="text-sm text-gray-400">{label}</span>}
    </label>
  )
)

Checkbox.displayName = 'Checkbox'
