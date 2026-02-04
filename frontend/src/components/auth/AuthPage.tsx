import { useState, type SubmitEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/lib/authStore'
import { ApiError } from '@/lib/api'
import { useNavigate } from '@tanstack/react-router'

type Mode = 'login' | 'register'

export function AuthPage() {
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const isRegister = mode === 'register'

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError('')
    setConfirmPassword('')
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError('')

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        await register(username, password)
      } else {
        await login(username, password)
      }
      navigate({ to: '/' })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isRegister
            ? 'Registration failed'
            : 'Invalid username or password',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-page flex h-dvh items-center justify-center">
      <div className="flex w-[420px] flex-col items-center gap-8">
        <img src="/logo.svg" alt="Fanvue" className="h-5" />

        <div className="border-border-card bg-surface-card w-full rounded-2xl border p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="auth-username"
                className="text-[13px] font-medium text-white"
              >
                Username
              </label>
              <input
                id="auth-username"
                type="text"
                placeholder={
                  isRegister ? 'Choose a username' : 'Enter your username'
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-border-input bg-surface-input placeholder:text-placeholder focus:border-brand h-11 rounded-lg border px-3.5 text-sm text-white transition-colors outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="auth-password"
                className="text-[13px] font-medium text-white"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                placeholder={isRegister ? 'Choose a password' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border-input bg-surface-input placeholder:text-placeholder focus:border-brand h-11 rounded-lg border px-3.5 text-sm text-white transition-colors outline-none"
              />
            </div>

            <AnimatePresence initial={false}>
              {isRegister && (
                <motion.div
                  key="confirm-password"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 pt-0">
                    <label
                      htmlFor="auth-confirm-password"
                      className="text-[13px] font-medium text-white"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="auth-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="border-border-input bg-surface-input placeholder:text-placeholder focus:border-brand h-11 rounded-lg border px-3.5 text-sm text-white transition-colors outline-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className="text-error text-[13px]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-brand text-surface-page flex h-[46px] items-center justify-center rounded-lg text-[15px] font-semibold transition-opacity disabled:opacity-60"
            >
              {loading
                ? isRegister
                  ? 'Creating account…'
                  : 'Signing in…'
                : isRegister
                  ? 'Create Account'
                  : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={switchMode}
              className="text-dim text-[13px] transition-colors hover:text-white"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
