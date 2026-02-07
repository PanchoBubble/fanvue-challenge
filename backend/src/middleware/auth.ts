import { Request, Response, NextFunction } from 'express'
import { AuthService, JwtPayload } from '../services/AuthService'
import { AppError } from './errorHandler'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

const authService = new AuthService()

/**
 * Middleware that requires a valid JWT Bearer token.
 * Attaches decoded user payload to req.user.
 * Verifies user still exists in DB.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid Authorization header'))
  }

  try {
    const token = header.slice(7) // Remove "Bearer "
    const payload = await authService.verifyTokenAndUser(token)
    req.user = payload
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Flexible auth middleware: checks Authorization header first,
 * falls back to ?token= query param. Used for SSE endpoints
 * where EventSource cannot send custom headers.
 * Verifies user still exists in DB.
 */
export async function requireAuthFlexible(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization

  let token: string | undefined

  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7)
  } else if (
    typeof req.query.token === 'string' &&
    req.query.token.length > 0
  ) {
    token = req.query.token
  }

  if (!token) {
    return next(new AppError(401, 'Missing authentication token'))
  }

  try {
    const payload = await authService.verifyTokenAndUser(token)
    req.user = payload
    next()
  } catch (error) {
    next(error)
  }
}
