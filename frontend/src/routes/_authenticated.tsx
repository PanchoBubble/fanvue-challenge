import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/authStore'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const { token } = useAuthStore.getState()
    if (!token) throw redirect({ to: '/auth' })
  },
  component: () => <Outlet />,
})
