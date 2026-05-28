import { InputHTMLAttributes, forwardRef, useState } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  icon?: React.ReactNode
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, icon, clearable, size = 'md', className = '', onChange, value, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value ?? '')

    const controlledValue = value !== undefined ? value : localValue
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) setLocalValue(e.target.value)
      onChange?.(e)
    }

    const handleClear = () => {
      if (value === undefined) setLocalValue('')
      if (onChange) {
        const native = new Event('change', { bubbles: true })
        Object.defineProperty(native, 'target', {
          value: { value: '' },
          writable: false,
        })
        onChange(native as unknown as React.ChangeEvent<HTMLInputElement>)
      }
    }

    return (
      <div>
        {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
        <div className="relative">
          {icon && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            value={controlledValue}
            onChange={handleChange}
            className={`w-full bg-gray-800 border rounded-lg text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 ${error ? 'border-red-500' : 'border-gray-700'} ${icon ? 'pl-10' : ''} ${clearable ? 'pr-8' : ''} ${sizeStyles[size]} ${className}`}
            {...props}
          />
          {clearable && controlledValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
