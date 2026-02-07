import { Repository } from 'typeorm'
import { Message } from '../entities/Message'
import { Thread } from '../entities/Thread'
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

  /**
   * Creates a message and updates the thread in a single transaction (2 roundtrips).
   * The UPDATE takes a row-level exclusive lock, serializing concurrent writes
   * and preventing race conditions on messageNumber and lastMessageText.
   */
  async createInThread(
    threadId: string,
    text: string,
    author: string,
  ): Promise<{ message: Message; thread: Thread }> {
    return AppDataSource.manager.transaction(async (manager) => {
      // 1) Atomically increment messageCount, update metadata, and return the row.
      //    UPDATE takes a row lock — concurrent writes to the same thread serialize here.
      const [updatedThread] = await manager.query(
        `UPDATE threads
            SET "messageCount" = "messageCount" + 1,
                "lastMessageAt" = NOW(),
                "lastMessageText" = $2,
                "updatedAt" = NOW()
          WHERE id = $1
          RETURNING *`,
        [threadId, text.trim()],
      )

      if (!updatedThread) {
        throw new AppError(404, 'Thread not found')
      }

      // 2) Insert the message using the already-incremented count
      const message = manager.create(Message, {
        threadId,
        text: text.trim(),
        author,
        messageNumber: updatedThread.messageCount,
      })
      const savedMessage = await manager.save(message)

      return { message: savedMessage, thread: updatedThread as Thread }
    })
  }
}
