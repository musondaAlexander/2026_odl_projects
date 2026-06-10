// Create/update all tables from the models (dev convenience; use migrations in prod).
import { sequelize } from '../models/index.js'

const force = process.argv.includes('--force')
try {
  await sequelize.sync({ force })
  console.log(`Schema synced${force ? ' (dropped & recreated)' : ''}.`)
  process.exit(0)
} catch (err) {
  console.error('Sync failed:', err.message)
  process.exit(1)
}
