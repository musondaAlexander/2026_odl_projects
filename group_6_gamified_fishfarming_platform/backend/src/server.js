import { createApp } from './app.js'
import { config } from './config/index.js'
import { sequelize } from './models/index.js'

async function start() {
  try {
    await sequelize.authenticate()
    // For dev we sync the schema; in production use migrations.
    await sequelize.sync()
    const app = createApp()
    app.listen(config.port, () => {
      console.log(`Fish-Farm API listening on http://localhost:${config.port} (${config.db.dialect})`)
    })
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

start()
