import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import { z } from 'zod'
import { CartItem, Order, OrderItem, Product, RecEvent, User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'
import { sign } from '../middleware/auth.js'
import { recordInteraction } from '../services/interactions.js'
import { paymentGateway } from '../services/paymentGateway.js'
import { logImpressions, topNForProduct } from '../services/recommendations.js'

const pubUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })

// ---- Auth ----
export const register = asyncHandler(async (req, res) => {
  const data = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) }).parse(req.body)
  if (await User.findOne({ where: { email: data.email } })) throw httpError(409, 'Email already registered.')
  const user = await User.create({ name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 10) })
  res.status(201).json({ token: sign(user), user: pubUser(user) })
})
export const login = asyncHandler(async (req, res) => {
  const data = z.object({ email: z.string().email(), password: z.string() }).parse(req.body)
  const user = await User.findOne({ where: { email: data.email } })
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw httpError(401, 'Invalid credentials.')
  res.json({ token: sign(user), user: pubUser(user) })
})

// ---- Catalogue ----
export const listProducts = asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.q) where.title = { [Op.like]: `%${req.query.q}%` }
  if (req.query.category) where.category = req.query.category
  const products = await Product.findAll({ where, order: [['createdAt', 'DESC']], limit: 100 })
  res.json({ products })
})

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id)
  if (!product) throw httpError(404, 'Product not found.')
  await recordInteraction({ userId: req.user?.id, productId: product.id, type: 'view' })
  res.json({ product })
})

// "Customers Also Bought" — top-5, A/B variant chosen per request/session.
export const productRecommendations = asyncHandler(async (req, res) => {
  const variant = req.query.variant === 'baseline' ? 'baseline' : 'personalised'
  const recs = await topNForProduct(Number(req.params.id), 5, variant)
  await logImpressions(Number(req.params.id), recs, variant)
  res.json({ variant, recommendations: recs })
})

export const trackRecClick = asyncHandler(async (req, res) => {
  await RecEvent.update({ clicked: true },
    { where: { productId: req.body.productId, recommendedId: req.body.recommendedId } })
  res.json({ ok: true })
})

// ---- Cart ----
export const getCart = asyncHandler(async (req, res) => {
  const items = await CartItem.findAll({ where: { UserId: req.user.id }, include: [Product] })
  const total = items.reduce((s, i) => s + i.quantity * Number(i.Product.price), 0)
  res.json({ items, total })
})
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body
  const product = await Product.findByPk(productId)
  if (!product) throw httpError(404, 'Product not found.')
  const [item, created] = await CartItem.findOrCreate({
    where: { UserId: req.user.id, ProductId: productId }, defaults: { quantity },
  })
  if (!created) { item.quantity += quantity; await item.save() }
  await recordInteraction({ userId: req.user.id, productId, type: 'add_to_cart' })
  res.status(201).json({ item })
})
export const removeFromCart = asyncHandler(async (req, res) => {
  await CartItem.destroy({ where: { UserId: req.user.id, ProductId: req.params.productId } })
  res.json({ ok: true })
})

// ---- Checkout ----
export const checkout = asyncHandler(async (req, res) => {
  const data = z.object({
    paymentMethod: z.enum(['mtn_momo', 'airtel_money']),
    phone: z.string().min(9),
  }).parse(req.body)

  const items = await CartItem.findAll({ where: { UserId: req.user.id }, include: [Product] })
  if (items.length === 0) throw httpError(400, 'Cart is empty.')
  const total = items.reduce((s, i) => s + i.quantity * Number(i.Product.price), 0)

  const payment = await paymentGateway.requestToPay({ method: data.paymentMethod, amount: total, phone: data.phone })
  const order = await Order.create({
    UserId: req.user.id, total, paymentMethod: data.paymentMethod, paymentRef: payment.ref,
    status: payment.success ? 'paid' : 'failed',
  })
  if (payment.success) {
    for (const it of items) {
      await OrderItem.create({ OrderId: order.id, ProductId: it.ProductId, quantity: it.quantity, unitPrice: it.Product.price })
      await it.Product.decrement('stock', { by: it.quantity })
      await recordInteraction({ userId: req.user.id, productId: it.ProductId, type: 'purchase' })
    }
    await CartItem.destroy({ where: { UserId: req.user.id } })
  }
  res.status(payment.success ? 201 : 402).json({ order, payment })
})

export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({ where: { UserId: req.user.id }, include: [OrderItem], order: [['createdAt', 'DESC']] })
  res.json({ orders })
})
