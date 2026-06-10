// Tests the payment gateway behaviour + Observer interaction logging on SQLite.
import test from 'node:test'
import assert from 'node:assert'

process.env.DB_DIALECT = 'sqlite'
process.env.SQLITE_STORAGE = ':memory:'
process.env.PAYMENTS_MODE = 'mock'

const { sequelize, Product, Interaction } = await import('../src/models/index.js')
const { paymentGateway } = await import('../src/services/paymentGateway.js')
const { recordInteraction } = await import('../src/services/interactions.js')

await sequelize.sync({ force: true })

test('mock payment gateway succeeds for a normal phone, fails for one ending in 0', async () => {
  const ok = await paymentGateway.requestToPay({ method: 'mtn_momo', amount: 100, phone: '0971234561' })
  assert.strictEqual(ok.success, true)
  assert.match(ok.ref, /^MTN_MOMO-/)
  const bad = await paymentGateway.requestToPay({ method: 'airtel_money', amount: 100, phone: '0971234560' })
  assert.strictEqual(bad.success, false)
})

test('recordInteraction (Observer) persists a typed event', async () => {
  const p = await Product.create({ title: 'X', price: 10, stock: 5 })
  await recordInteraction({ userId: null, productId: p.id, type: 'view' })
  const count = await Interaction.count({ where: { ProductId: p.id, type: 'view' } })
  assert.strictEqual(count, 1)
})

test('cleanup', async () => { await sequelize.close() })
