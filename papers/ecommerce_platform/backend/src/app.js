import cors from 'cors'
import express from 'express'
import { config } from './config/index.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middleware/error.js'

export function createApp() {
  const app = express()
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json())
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api', routes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}
