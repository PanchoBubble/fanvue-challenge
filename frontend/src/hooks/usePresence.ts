import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/authStore'
import { queryKeys } from '@/lib/queryKeys'

const HEARTBEAT_INTERVAL = 5_000

export function useHeartbeat() {
  const [onlineCount, setOnlineCount] = useState(0)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const focusedRef = useRef(true)

  useEffect(() => {
    const onFocus = () => {
      focusedRef.current = true
    }
    const onBlur = () => {
      focusedRef.current = false
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const send = async () => {
      try {
        const res = await apiFetch<{ onlineCount: number }>('/api/heartbeat', {
          method: 'POST',
          body: JSON.stringify({ focused: focusedRef.current }),
        })
        setOnlineCount(res.onlineCount)
      } catch {
        // silently ignore heartbeat failures
      }
    }

    send()
    const id = setInterval(send, HEARTBEAT_INTERVAL)
    return () => clearInterval(id)
  }, [isAuthenticated])

  return onlineCount
}

export function useOnlineUsers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.presence.onlineUsers(),
    queryFn: ({ signal }) =>
      apiFetch<{ users: string[] }>('/api/users/online', { signal }).then(
        (r) => r.users,
      ),
    enabled,
    refetchInterval: enabled ? HEARTBEAT_INTERVAL : false,
  })
}
