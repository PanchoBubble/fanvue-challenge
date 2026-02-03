import { type FormEvent, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate({ to: '/' })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Invalid username or password',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Username */}
      <div className="flex flex-col gap-2">
        <label htmlFor="login-username" className="text-[13px] font-medium text-white">
          Username
        </label>
        <input
          id="login-username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="h-11 rounded-lg border border-border-input bg-surface-input px-3.5 text-sm text-white placeholder:text-placeholder outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="text-[13px] font-medium text-white">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11 rounded-lg border border-border-input bg-surface-input px-3.5 text-sm text-white placeholder:text-placeholder outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Error */}
      {error && <p className="text-[13px] text-error">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="flex h-[46px] items-center justify-center rounded-lg bg-brand text-[15px] font-semibold text-surface-page transition-opacity disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
