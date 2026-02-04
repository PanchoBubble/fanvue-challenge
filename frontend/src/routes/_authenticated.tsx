import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const token = localStorage.getItem('fanvue_token')
    if (!token) throw redirect({ to: '/auth' })
  },
  component: () => <Outlet />,
})
