import express from 'express'
import { corsMiddleware } from './middleware/cors'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import threadRoutes from './routes/threads'
import messageRoutes, { sseService } from './routes/messages'
import userRoutes from './routes/users'
import { requireAuth, requireAuthFlexible } from './middleware/auth'
import { seed } from './seed/seedData'

const app = express()

// Middleware
app.use(corsMiddleware)
app.use(express.json({ limit: '16kb' }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/threads/:id/messages', requireAuthFlexible, messageRoutes)
// SSE stream for thread-level events (must be before requireAuth mount)
app.get('/api/threads/stream', requireAuthFlexible, (_req, res, next) => {
  try {
    sseService.addGlobalClient(res)
  } catch (err) {
    next(err)
  }
})
app.use('/api/threads', requireAuth, threadRoutes)
app.use('/api/users', requireAuth, userRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Admin: seed database
app.post('/api/admin/seed', async (req, res, next) => {
  try {
    const adminSecret = process.env.ADMIN_SECRET || 'fanvue-admin'
    if (req.query.secret !== adminSecret) {
      res.status(403).json({ error: 'Invalid secret' })
      return
    }
    const result = await seed()
    res.json({ status: 'ok', message: result })
  } catch (err) {
    next(err)
  }
})

// Error handler (must be last)
app.use(errorHandler)

export default app
