import { Repository } from 'typeorm'
import { Message } from '../entities/Message'
import { AppDataSource } from '../config/database'
import { encodeCursor, decodeCursor } from '../utils/cursor'
import { AppError } from '../middleware/errorHandler'

interface PaginatedMessages {
  items: Message[]
  nextCursor: string | null
}

export class MessageService {
  private repo: Repository<Message>

  constructor() {
    this.repo = AppDataSource.getRepository(Message)
  }

  async getByThread(
    threadId: string,
    cursor?: string,
    limit = 50,
  ): Promise<PaginatedMessages> {
    const qb = this.repo
      .createQueryBuilder('msg')
      .where('msg.threadId = :threadId', { threadId })
      .orderBy('msg.createdAt', 'DESC')
      .limit(limit + 1) // Fetch one extra to determine if there's a next page

    if (cursor) {
      try {
        const cursorDate = decodeCursor(cursor)
        qb.andWhere('msg.createdAt < :cursor', { cursor: cursorDate })
      } catch {
        throw new AppError(400, 'Invalid cursor')
      }
    }

    const messages = await qb.getMany()
    const hasMore = messages.length > limit

    if (hasMore) {
      messages.pop() // Remove the extra item
    }

    // Reverse so items are in chronological order (oldest first)
    messages.reverse()

    return {
      items: messages,
      nextCursor: hasMore ? encodeCursor(messages[0].createdAt) : null,
    }
  }

  async create(
    threadId: string,
    text: string,
    author: string,
    messageNumber: number,
  ): Promise<Message> {
    const message = this.repo.create({
      threadId,
      text: text.trim(),
      author,
      messageNumber,
    })

    return this.repo.save(message)
  }
}
