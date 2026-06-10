import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config/index.js'
import { Patient, User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'
import { signAccess, signRefresh } from '../middleware/auth.js'

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone })

// Public self-registration always creates a Patient (+ linked patient profile).
export const register = asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  })
  const data = schema.parse(req.body)
  if (await User.findOne({ where: { email: data.email } })) throw httpError(409, 'Email already registered.')
  const user = await User.create({
    name: data.name, email: data.email, phone: data.phone,
    passwordHash: await bcrypt.hash(data.password, 10), role: 'patient',
  })
  await Patient.create({
    userId: user.id, fullName: data.name, phone: data.phone,
    dateOfBirth: data.dateOfBirth || null, gender: data.gender || null,
  })
  res.status(201).json({ accessToken: signAccess(user), refreshToken: signRefresh(user), user: publicUser(user) })
})

export const login = asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string() })
  const data = schema.parse(req.body)
  const user = await User.findOne({ where: { email: data.email } })
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw httpError(401, 'Invalid credentials.')
  }
  if (!user.isActive) throw httpError(403, 'Account disabled.')
  res.json({ accessToken: signAccess(user), refreshToken: signRefresh(user), user: publicUser(user) })
})

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) throw httpError(400, 'refreshToken required.')
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret)
    if (payload.type !== 'refresh') throw new Error('bad type')
    const user = await User.findByPk(payload.sub)
    if (!user || !user.isActive) throw new Error('inactive')
    res.json({ accessToken: signAccess(user) })
  } catch {
    throw httpError(401, 'Invalid refresh token.')
  }
})

export const me = asyncHandler(async (req, res) => {
  const profile = req.user.role === 'patient'
    ? await Patient.findOne({ where: { userId: req.user.id } })
    : null
  res.json({ user: publicUser(req.user), patientProfile: profile })
})
