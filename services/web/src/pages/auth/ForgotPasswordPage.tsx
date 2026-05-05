import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface FormData { email: string }

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', data)
      setSent(true)
    } catch {
      toast.error('Failed to send reset email.')
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-100 text-sm">Check your email for a password reset link.</p>
        <Link to="/login" className="text-indigo-400 text-sm hover:underline">Back to login</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100">Reset password</h2>
      <input
        {...register('email', { required: true })}
        type="email"
        placeholder="Email address"
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>
      <Link to="/login" className="block text-center text-gray-500 text-sm hover:text-gray-300">
        Back to login
      </Link>
    </form>
  )
}
