import { fn, col } from 'sequelize'
import { z } from 'zod'
import { Order, OrderItem, Product, RecEvent, User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'

// ---- Inventory CRUD ----
export const createProduct = asyncHandler(async (req, res) => {
  const data = z.object({
    title: z.string().min(2), description: z.string().optional(), category: z.string().optional(),
    price: z.number().positive(), stock: z.number().int().min(0).optional(), imageUrl: z.string().optional(),
  }).parse(req.body)
  res.status(201).json({ product: await Product.create(data) })
})
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id)
  if (!product) throw httpError(404, 'Product not found.')
  Object.assign(product, req.body)
  await product.save()
  res.json({ product })
})
export const deleteProduct = asyncHandler(async (req, res) => {
  const n = await Product.destroy({ where: { id: req.params.id } })
  if (!n) throw httpError(404, 'Product not found.')
  res.status(204).end()
})

// ---- Orders ----
export const allOrders = asyncHandler(async (_req, res) => {
  const orders = await Order.findAll({ include: [{ model: User, attributes: ['id', 'name', 'email'] }, OrderItem], order: [['createdAt', 'DESC']], limit: 200 })
  res.json({ orders })
})

// ---- Analytics incl. recommendation CTR (+ A/B breakdown) ----
export const analytics = asyncHandler(async (_req, res) => {
  const products = await Product.count()
  const orders = await Order.count({ where: { status: 'paid' } })
  const revenue = await Order.sum('total', { where: { status: 'paid' } })

  const ctr = async (variant) => {
    const shown = await RecEvent.count({ where: { variant } })
    const clicked = await RecEvent.count({ where: { variant, clicked: true } })
    return { shown, clicked, ctr: shown ? Math.round((clicked / shown) * 1000) / 10 : 0 }
  }
  res.json({
    products, paidOrders: orders, revenue: Number(revenue || 0),
    recommendationCtr: { personalised: await ctr('personalised'), baseline: await ctr('baseline') },
  })
})

// ---- User management ----
export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role', 'createdAt'], order: [['createdAt', 'DESC']] })
  res.json({ users })
})
export const setUserRole = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id)
  if (!user) throw httpError(404, 'User not found.')
  user.role = z.enum(['customer', 'admin']).parse(req.body.role)
  await user.save()
  res.json({ user: { id: user.id, role: user.role } })
})
