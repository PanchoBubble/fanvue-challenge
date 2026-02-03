import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPage } from '@/components/auth/AuthPage'

export const Route = createFileRoute('/auth')({
  beforeLoad: () => {
    const token = localStorage.getItem('fanvue_token')
    if (token) throw redirect({ to: '/' })
  },
  component: AuthPage,
})
