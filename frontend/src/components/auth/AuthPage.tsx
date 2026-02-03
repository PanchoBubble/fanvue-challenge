import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type Tab = 'login' | 'register'

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')

  return (
    <div className="flex h-screen items-center justify-center bg-surface-page">
      <div className="flex w-[420px] flex-col items-center gap-8">
        {/* Logo */}
        <img src="/logo.svg" alt="Fanvue" className="h-5" />

        {/* Auth Card */}
        <div className="w-full overflow-hidden rounded-2xl border border-border-card bg-surface-card">
          {/* Tabs */}
          <div className="flex h-12">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`relative flex flex-1 items-center justify-center text-[15px] font-semibold transition-colors ${
                tab === 'login' ? 'text-brand' : 'text-dim'
              }`}
            >
              Login
              {tab === 'login' && (
                <motion.div
                  layoutId="auth-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand"
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`relative flex flex-1 items-center justify-center text-[15px] font-medium transition-colors ${
                tab === 'register' ? 'text-brand' : 'text-dim'
              }`}
            >
              Register
              {tab === 'register' && (
                <motion.div
                  layoutId="auth-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand"
                />
              )}
            </button>
          </div>

          {/* Form Area */}
          <div className="relative p-8">
            <AnimatePresence mode="wait">
              {tab === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <LoginForm />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <RegisterForm />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
