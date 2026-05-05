import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getSocket } from '@/lib/socket'

export function useSocket() {
  const token = useAuthStore((s) => s.token)
  const initialized = useRef(false)

  useEffect(() => {
    if (!token || initialized.current) return
    initialized.current = true
    getSocket()
    return () => {
      initialized.current = false
    }
  }, [token])

  return token ? getSocket() : null
}
