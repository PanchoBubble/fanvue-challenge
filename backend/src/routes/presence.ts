import { Router } from 'express'
import { PresenceService } from '../services/PresenceService'

const router = Router()
export const presenceService = new PresenceService()

// POST /api/heartbeat — set user online, return online count
router.post('/heartbeat', async (req, res, next) => {
  try {
    const user = (req as any).user
    const onlineCount = await presenceService.setOnline(user.id, user.username)
    res.json({ onlineCount })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/online — return list of online usernames
router.get('/users/online', async (_req, res, next) => {
  try {
    const users = await presenceService.getOnlineUsers()
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

export default router
