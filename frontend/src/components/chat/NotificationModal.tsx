import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/lib/notificationStore'
import { Bell } from 'lucide-react'

export function NotificationModal() {
  const { isModalOpen, isLoading, setPreference, closeModal } =
    useNotificationStore()

  return createPortal(
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />

          {/* Card */}
          <motion.div
            className="border-border-card bg-surface-card relative z-10 mx-4 w-full max-w-sm rounded-xl border p-5"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-4 flex justify-center">
              <div className="bg-accent/10 rounded-full p-3">
                <Bell className="text-accent h-6 w-6" />
              </div>
            </div>
            <h3 className="text-center text-base font-semibold text-white">
              Enable Notifications?
            </h3>
            <p className="text-dim mt-2 text-center text-sm">
              Get notified when you receive new messages, even when this tab is
              in the background.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => setPreference('granted')}
                disabled={isLoading}
                className="bg-accent hover:bg-accent/90 flex h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                Enable Notifications
              </button>
              <button
                onClick={() => setPreference('ask_later')}
                disabled={isLoading}
                className="border-border-card text-dim flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                Ask Me Later
              </button>
              <button
                onClick={() => setPreference('never')}
                disabled={isLoading}
                className="text-dim/60 hover:text-dim flex h-10 cursor-pointer items-center justify-center text-sm font-medium transition-colors disabled:opacity-50"
              >
                Don't Ask Again
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
