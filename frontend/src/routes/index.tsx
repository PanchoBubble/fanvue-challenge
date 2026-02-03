import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const token = localStorage.getItem('fanvue_token')
    if (!token) throw redirect({ to: '/auth' })
  },
  component: () => (
    <div className="flex h-screen items-center justify-center bg-surface-page">
      <img src="/logo.svg" alt="Fanvue" className="h-8" />
    </div>
  ),
})
