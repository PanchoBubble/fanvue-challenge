import { create } from 'zustand'
import { apiFetch } from './api'

type NotificationPreference = 'granted' | 'ask_later' | 'never' | null

interface NotificationState {
  preference: NotificationPreference
  modalShownThisSession: boolean
  isModalOpen: boolean
  isLoading: boolean

  fetchPreference: () => Promise<void>
  setPreference: (pref: 'granted' | 'ask_later' | 'never') => Promise<void>
  openModal: () => void
  closeModal: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  preference: null,
  modalShownThisSession: false,
  isModalOpen: false,
  isLoading: false,

  fetchPreference: async () => {
    try {
      const data = await apiFetch<{ preference: NotificationPreference }>(
        '/api/users/notification-preference',
      )
      set({ preference: data.preference })
    } catch {
      // Ignore errors, treat as null preference
    }
  },

  setPreference: async (pref) => {
    set({ isLoading: true })
    try {
      await apiFetch('/api/users/notification-preference', {
        method: 'PUT',
        body: JSON.stringify({ preference: pref }),
      })
      set({
        preference: pref,
        isModalOpen: false,
        modalShownThisSession: true,
        isLoading: false,
      })

      // If granted, request browser permission
      if (pref === 'granted' && 'Notification' in window) {
        Notification.requestPermission()
      }
    } catch {
      set({ isLoading: false })
    }
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, modalShownThisSession: true }),
}))
