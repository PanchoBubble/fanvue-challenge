import Redis from 'ioredis'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const KEY_PREFIX = 'online:'
const TTL_SECONDS = 10

export class PresenceService {
  private redis: Redis

  constructor() {
    this.redis = new Redis(env.redisUrl)
    this.redis.on('error', (err) => {
      logger.error('Presence Redis error', err)
    })
  }

  async setOnline(userId: string, username: string): Promise<number> {
    await this.redis.set(`${KEY_PREFIX}${userId}`, username, 'EX', TTL_SECONDS)
    return this.getOnlineCount()
  }

  async getOnlineCount(): Promise<number> {
    let count = 0
    let cursor = '0'
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${KEY_PREFIX}*`,
        'COUNT',
        100,
      )
      cursor = next
      count += keys.length
    } while (cursor !== '0')
    return count
  }

  async getOnlineUsers(): Promise<string[]> {
    const usernames: string[] = []
    let cursor = '0'
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${KEY_PREFIX}*`,
        'COUNT',
        100,
      )
      cursor = next
      if (keys.length > 0) {
        const values = await this.redis.mget(...keys)
        for (const v of values) {
          if (v) usernames.push(v)
        }
      }
    } while (cursor !== '0')
    return usernames
  }

  async shutdown(): Promise<void> {
    await this.redis.quit()
    logger.info('Presence service shut down')
  }
}
