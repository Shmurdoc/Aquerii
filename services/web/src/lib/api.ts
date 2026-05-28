import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

// Attach auth token + workspace header on every request
api.interceptors.request.use((config) => {
  const { token, workspace } = useAuthStore.getState()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (workspace) {
    config.headers['X-Workspace-ID'] = workspace.id
  }

  // Auto-generate Idempotency-Key for mutating requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = crypto.randomUUID()
    }
  }

  return config
})

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const code   = err.response?.data?.error?.code

    if (status === 401 && code !== 'MFA_REQUIRED') {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (status === 402) {
      toast.error('Quota exceeded. Please upgrade your plan.')
    }

    if (status === 429) {
      toast.error('Too many requests. Please slow down.')
    }

    if (status === 503) {
      toast.error('Service temporarily unavailable. Please try again.')
    }

    return Promise.reject(err)
  }
)
