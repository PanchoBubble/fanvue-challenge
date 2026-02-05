import Redis from 'ioredis'
import { env } from '../config/env'

const NOTIFICATION_PREF_PREFIX = 'notification_pref:'

export type NotificationPreference = 'granted' | 'ask_later' | 'never' | null

export class PreferenceService {
  private redis: Redis

  constructor() {
    this.redis = new Redis(env.redisUrl)
  }

  async getNotificationPreference(
    userId: string,
  ): Promise<NotificationPreference> {
    const value = await this.redis.get(`${NOTIFICATION_PREF_PREFIX}${userId}`)
    if (!value) return null
    return value as NotificationPreference
  }

  async setNotificationPreference(
    userId: string,
    preference: 'granted' | 'ask_later' | 'never',
  ): Promise<void> {
    await this.redis.set(`${NOTIFICATION_PREF_PREFIX}${userId}`, preference)
  }
}
