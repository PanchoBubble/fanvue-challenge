import { Repository, In } from 'typeorm'
import { Reaction } from '../entities/Reaction'
import { AppDataSource } from '../config/database'

type ReactionMap = Record<
  string,
  Record<string, { count: number; userIds: string[] }>
>

export class ReactionService {
  private repo: Repository<Reaction>

  constructor() {
    this.repo = AppDataSource.getRepository(Reaction)
  }

  /**
   * Toggle a reaction for a user on a message.
   * - Same type exists → remove it
   * - Different type exists → update it
   * - No reaction → insert it
   * Returns the action taken and aggregated reactions for the message.
   */
  async toggle(
    messageId: string,
    userId: string,
    type: string,
  ): Promise<{
    action: 'added' | 'removed' | 'changed'
    reactions: ReactionMap[string]
  }> {
    const existing = await this.repo.findOne({ where: { messageId, userId } })

    let action: 'added' | 'removed' | 'changed'

    if (existing) {
      if (existing.type === type) {
        await this.repo.remove(existing)
        action = 'removed'
      } else {
        existing.type = type
        await this.repo.save(existing)
        action = 'changed'
      }
    } else {
      const reaction = this.repo.create({ messageId, userId, type })
      await this.repo.save(reaction)
      action = 'added'
    }

    const reactions = await this.aggregateForMessage(messageId)
    return { action, reactions }
  }

  /**
   * Batch load reactions for multiple messages.
   * Returns a map of messageId → type → { count, userIds }.
   */
  async getForMessages(messageIds: string[]): Promise<ReactionMap> {
    if (messageIds.length === 0) return {}

    const reactions = await this.repo.find({
      where: { messageId: In(messageIds) },
      select: ['messageId', 'userId', 'type'],
    })

    const result: ReactionMap = {}
    for (const r of reactions) {
      if (!result[r.messageId]) result[r.messageId] = {}
      if (!result[r.messageId][r.type]) {
        result[r.messageId][r.type] = { count: 0, userIds: [] }
      }
      result[r.messageId][r.type].count++
      result[r.messageId][r.type].userIds.push(r.userId)
    }

    return result
  }

  private async aggregateForMessage(
    messageId: string,
  ): Promise<Record<string, { count: number; userIds: string[] }>> {
    const reactions = await this.repo.find({
      where: { messageId },
      select: ['userId', 'type'],
    })

    const result: Record<string, { count: number; userIds: string[] }> = {}
    for (const r of reactions) {
      if (!result[r.type]) result[r.type] = { count: 0, userIds: [] }
      result[r.type].count++
      result[r.type].userIds.push(r.userId)
    }

    return result
  }
}
