import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/authStore'
import { AuthPage } from '@/components/auth/AuthPage'

export const Route = createFileRoute('/auth')({
  beforeLoad: () => {
    const { token } = useAuthStore.getState()
    if (token) throw redirect({ to: '/' })
  },
  component: AuthPage,
})
