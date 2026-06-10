import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { config } from './config/index.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middleware/error.js'

export function createApp() {
  const app = express()
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json({ limit: '2mb' }))

  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }))

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
