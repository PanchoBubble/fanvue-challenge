import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'

export function validateMessageBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { text } = req.body

  if (!text || typeof text !== 'string') {
    return next(new AppError(400, 'Missing required field: text'))
  }

  if (text.trim().length === 0) {
    return next(new AppError(422, 'Message text cannot be empty'))
  }

  if (text.length > 10000) {
    return next(
      new AppError(
        422,
        'Message text exceeds maximum length of 10,000 characters',
      ),
    )
  }

  next()
}

export function validateThreadBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { title } = req.body

  if (!title || typeof title !== 'string') {
    return next(new AppError(400, 'Missing required field: title'))
  }

  if (title.trim().length < 2) {
    return next(new AppError(422, 'Thread title must be at least 2 characters'))
  }

  if (title.length > 255) {
    return next(
      new AppError(
        422,
        'Thread title exceeds maximum length of 255 characters',
      ),
    )
  }

  next()
}

export function validatePaginationParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { limit } = req.query

  if (limit !== undefined) {
    const parsed = parseInt(limit as string, 10)
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      return next(new AppError(400, 'Limit must be between 1 and 100'))
    }
  }

  next()
}
