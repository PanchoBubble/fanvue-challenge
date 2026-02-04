import { Router, Request, Response, NextFunction } from 'express'
import { MessageService } from '../services/MessageService'
import { ThreadService } from '../services/ThreadService'
import { SSEService } from '../services/SSEService'
import {
  validateMessageBody,
  validatePaginationParams,
} from '../middleware/validation'

const router = Router({ mergeParams: true })
const messageService = new MessageService()
const threadService = new ThreadService()
const sseService = new SSEService()

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
      res.json(result)
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

      // Get thread (also verifies it exists)
      const thread = await threadService.getById(id)

      // Author comes from JWT token
      const author = req.user!.username
      const messageNumber = thread.messageCount + 1
      const message = await messageService.create(
        id,
        text,
        author,
        messageNumber,
      )

      // Update thread metadata
      const updatedThread = await threadService.updateLastMessage(
        id,
        message.createdAt,
        message.text,
      )

      // Broadcast message to thread subscribers + thread update to global subscribers
      await sseService.broadcastMessage(id, message)
      await sseService.broadcastThreadUpdated(updatedThread)

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
