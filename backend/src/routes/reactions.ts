import { Router, Request, Response, NextFunction } from 'express'
import { ReactionService } from '../services/ReactionService'
import { SSEService } from '../services/SSEService'
import { AppDataSource } from '../config/database'
import { Message } from '../entities/Message'
import { AppError } from '../middleware/errorHandler'

const router = Router({ mergeParams: true })
const reactionService = new ReactionService()
const sseService = new SSEService()

const VALID_TYPES = ['heart', 'thumbs_up', 'thumbs_down']

/**
 * POST /api/messages/:messageId/reactions
 * Body: { type: "heart" | "thumbs_up" | "thumbs_down" }
 * Toggles a reaction and broadcasts via SSE.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params
    const { type } = req.body
    const userId = req.user!.userId

    if (!type || !VALID_TYPES.includes(type)) {
      throw new AppError(
        400,
        `Invalid reaction type. Must be one of: ${VALID_TYPES.join(', ')}`,
      )
    }

    // Look up the message to get its threadId for SSE broadcast
    const message = await AppDataSource.getRepository(Message).findOne({
      where: { id: messageId },
      select: ['id', 'threadId'],
    })

    if (!message) {
      throw new AppError(404, 'Message not found')
    }

    const { action, reactions } = await reactionService.toggle(
      messageId,
      userId,
      type,
    )

    // Broadcast reaction update to all clients watching this thread
    await sseService.broadcastReaction(message.threadId, {
      messageId,
      reactions,
    })

    res.json({ action, reactions })
  } catch (err) {
    next(err)
  }
})

export { sseService as reactionSseService }
export default router
