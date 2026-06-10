import { createApp } from './app.js'
import { config } from './config/index.js'
import { sequelize } from './models/index.js'

async function start() {
  try {
    await sequelize.authenticate()
    await sequelize.sync()
    createApp().listen(config.port, () =>
      console.log(`E-commerce API on http://localhost:${config.port} (${config.db.dialect}, payments=${config.paymentsMode})`),
    )
  } catch (e) { console.error('Failed to start:', e.message); process.exit(1) }
}
start()
