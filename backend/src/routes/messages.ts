import { Router, Request, Response, NextFunction } from 'express'
import { MessageService } from '../services/MessageService'
import { ThreadService } from '../services/ThreadService'
import { SSEService } from '../services/SSEService'
import { ReactionService } from '../services/ReactionService'
import {
  validateMessageBody,
  validatePaginationParams,
} from '../middleware/validation'
const router = Router({ mergeParams: true })
const messageService = new MessageService()
const threadService = new ThreadService()
const sseService = new SSEService()
const reactionService = new ReactionService()

/**
 * GET /api/threads/:id/messages?cursor=<string>&limit=<number>
 * Returns paginated messages for a thread in chronological order.
 */
router.get(
  '/',
  validatePaginationParams,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const cursor = req.query.cursor as string | undefined
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50

      // Verify thread exists
      await threadService.getById(id)

      const result = await messageService.getByThread(id, cursor, limit)

      // Attach reactions to each message
      const messageIds = result.items.map((m) => m.id)
      const reactionsMap = await reactionService.getForMessages(messageIds)
      const items = result.items.map((m) => ({
        ...m,
        reactions: reactionsMap[m.id] || {},
      }))

      res.json({ ...result, items })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * POST /api/threads/:id/messages
 * Adds a new message to a thread.
 * Body: { text: string }
 */
router.post(
  '/',
  validateMessageBody,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { text } = req.body
      const author = req.user!.username

      // Single transaction: locks thread row, creates message, updates thread
      const { message, thread } = await messageService.createInThread(
        id,
        text,
        author,
      )

      // Broadcast in parallel — these are independent Redis publishes
      await Promise.all([
        sseService.broadcastMessage(id, message),
        sseService.broadcastThreadUpdated(thread, message.author),
      ])

      res.status(201).json({ message })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * GET /api/threads/:id/stream
 * SSE endpoint — pushes new messages in real time.
 */
router.get('/stream', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    sseService.addClient(id, res)
  } catch (err) {
    next(err)
  }
})

export { sseService }
export default router
