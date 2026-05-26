import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
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

// ── Refresh token queue ─────────────────────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

async function refreshAuthToken(): Promise<string> {
  const { token } = useAuthStore.getState()
  if (!token) throw new Error('No token to refresh')
  const res = await axios.post('/api/auth/refresh', { token })
  const newToken: string = res.data.data?.token ?? res.data.token
  if (!newToken) throw new Error('Refresh response missing token')
  useAuthStore.setState((s) => ({ ...s, token: newToken }))
  return newToken
}

// ── Request interceptor ─────────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, workspace } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (workspace) config.headers['X-Workspace-ID'] = workspace.id
  if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = crypto.randomUUID()
    }
  }
  return config
})

// ── Response interceptor with silent token refresh ─────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const status = err.response?.status
    const code = (err.response?.data as { error?: { code?: string } })?.error?.code
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // ── 401 → try refresh (skip for MFA & refresh endpoint itself)
    if (status === 401 && code !== 'MFA_REQUIRED' && !originalRequest._retry) {
      const refreshPath = '/api/auth/refresh'
      if (originalRequest.url === refreshPath) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshAuthToken()
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 402) toast.error('Quota exceeded. Please upgrade your plan.')
    if (status === 429) toast.error('Too many requests. Please slow down.')
    if (status === 503) toast.error('Service temporarily unavailable. Please try again.')
    return Promise.reject(err)
  }
)
