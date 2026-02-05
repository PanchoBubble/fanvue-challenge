import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/lib/authStore'
import { useNotificationStore } from '@/lib/notificationStore'
import { API_BASE } from '@/lib/api'
import type { Thread } from '@/types/api'

/**
 * Show a browser notification for a new message.
 */
function showNotification(thread: Thread & { lastMessageUser?: string }) {
  if (
    !('Notification' in window) ||
    Notification.permission !== 'granted' ||
    !document.hidden
  ) {
    return
  }

  const title = thread.otherParticipant?.username || 'New Message'
  const body = thread.lastMessageText || 'You have a new message'

  new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: `thread-${thread.id}`, // Prevent duplicate notifications for same thread
  })
}

/**
 * Global SSE stream for thread-level events (e.g. new thread created).
 * Updates the thread list cache in real-time.
 */
export function useThreadsStream() {
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.token)
  const username = useAuthStore((s) => s.user?.username)
  const fetchPreference = useNotificationStore((s) => s.fetchPreference)
  const hasFetchedPref = useRef(false)

  // Fetch notification preference on mount
  useEffect(() => {
    if (token && !hasFetchedPref.current) {
      hasFetchedPref.current = true
      fetchPreference()
    }
  }, [token, fetchPreference])

  useEffect(() => {
    if (!token) return

    const url = `${API_BASE}/api/threads/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.addEventListener('thread_created', (e) => {
      const thread: Thread = JSON.parse(e.data)

      // Update all thread list queries by prepending the new thread
      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.all },
        (old) => {
          if (!old) return [thread]
          if (old.some((t) => t.id === thread.id)) return old
          return [thread, ...old]
        },
      )
    })

    es.addEventListener('thread_updated', (e) => {
      const thread: Thread & { lastMessageUser?: string } = JSON.parse(e.data)
      const isFromOther =
        thread.lastMessageUser && thread.lastMessageUser !== username

      // Handle notifications for messages from others
      if (isFromOther) {
        const { preference, modalShownThisSession, openModal } =
          useNotificationStore.getState()

        if (preference === 'granted') {
          showNotification(thread)
        } else if (
          (preference === null || preference === 'ask_later') &&
          !modalShownThisSession
        ) {
          openModal()
        }
      }

      // Update the thread and re-sort by lastMessageAt descending
      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.all },
        (old) => {
          if (!old) return old
          return old
            .map((t) => (t.id === thread.id ? thread : t))
            .sort(
              (a, b) =>
                new Date(b.lastMessageAt).getTime() -
                new Date(a.lastMessageAt).getTime(),
            )
        },
      )
    })

    es.addEventListener('thread_deleted', (e) => {
      const { id } = JSON.parse(e.data)

      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.all },
        (old) => {
          if (!old) return old
          return old.filter((t) => t.id !== id)
        },
      )

      // Remove cached messages for the deleted thread
      qc.removeQueries({ queryKey: queryKeys.messages.byThread(id) })
    })

    return () => es.close()
  }, [qc, token, username])
}
