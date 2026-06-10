import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config/index.js'
import { User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, xp: u.xp })

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body)
  const exists = await User.findOne({ where: { email: data.email } })
  if (exists) throw httpError(409, 'Email already registered.')
  const passwordHash = await bcrypt.hash(data.password, 10)
  // Self-registration always creates a learner; trainers/admins are provisioned by an admin.
  const user = await User.create({ ...data, passwordHash, role: 'learner' })
  res.status(201).json({ token: sign(user), user: publicUser(user) })
})

export const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body)
  const user = await User.findOne({ where: { email: data.email } })
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw httpError(401, 'Invalid credentials.')
  }
  if (!user.isActive) throw httpError(403, 'Account disabled.')
  user.lastActiveAt = new Date()
  await user.save()
  res.json({ token: sign(user), user: publicUser(user) })
})

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) })
})
