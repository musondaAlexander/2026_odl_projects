import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import { z } from 'zod'
import { User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  phone: u.phone, specialization: u.specialization, isActive: u.isActive,
})

export const listUsers = asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.role) where.role = req.query.role
  const users = await User.findAll({ where, order: [['createdAt', 'DESC']] })
  res.json({ users: users.map(publicUser) })
})

// List doctors (used by booking UI) — available to any authenticated user.
export const listDoctors = asyncHandler(async (_req, res) => {
  const doctors = await User.findAll({ where: { role: 'doctor', isActive: true } })
  res.json({ doctors: doctors.map(publicUser) })
})

export const createUser = asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'doctor', 'nurse', 'patient']),
    phone: z.string().optional(),
    specialization: z.string().optional(),
  })
  const data = schema.parse(req.body)
  if (await User.findOne({ where: { email: data.email } })) throw httpError(409, 'Email exists.')
  const user = await User.create({
    name: data.name, email: data.email, role: data.role,
    phone: data.phone, specialization: data.specialization,
    passwordHash: await bcrypt.hash(data.password, 10),
  })
  res.status(201).json({ user: publicUser(user) })
})

export const updateUser = asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['admin', 'doctor', 'nurse', 'patient']).optional(),
    isActive: z.boolean().optional(),
    specialization: z.string().optional(),
    phone: z.string().optional(),
  })
  const user = await User.findByPk(req.params.id)
  if (!user) throw httpError(404, 'User not found.')
  Object.assign(user, schema.parse(req.body))
  await user.save()
  res.json({ user: publicUser(user) })
})

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id)
  if (!user) throw httpError(404, 'User not found.')
  if (user.id === req.user.id) throw httpError(400, 'You cannot delete your own account.')
  await user.destroy()
  res.status(204).end()
})
