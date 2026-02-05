import { Router, Request, Response, NextFunction } from 'express'
import { PreferenceService } from '../services/PreferenceService'
import { AppError } from '../middleware/errorHandler'

const router = Router()
const preferenceService = new PreferenceService()

/**
 * GET /api/users/notification-preference
 * Returns the user's notification preference
 */
router.get(
  '/notification-preference',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preference = await preferenceService.getNotificationPreference(
        req.user!.userId,
      )
      res.json({ preference })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * PUT /api/users/notification-preference
 * Body: { preference: 'granted' | 'ask_later' | 'never' }
 */
router.put(
  '/notification-preference',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { preference } = req.body

      if (!['granted', 'ask_later', 'never'].includes(preference)) {
        throw new AppError(
          400,
          'Preference must be one of: granted, ask_later, never',
        )
      }

      await preferenceService.setNotificationPreference(
        req.user!.userId,
        preference,
      )
      res.json({ preference })
    } catch (err) {
      next(err)
    }
  },
)

export default router
