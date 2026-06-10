import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Badge, Cohort, FieldTask, User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, xp: u.xp,
  isActive: u.isActive, CohortId: u.CohortId, lastActiveAt: u.lastActiveAt,
})

// ---- User management ----
export const listUsers = asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.role) where.role = req.query.role
  const users = await User.findAll({ where, order: [['createdAt', 'DESC']] })
  res.json({ users: users.map(publicUser) })
})

export const createUser = asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['learner', 'trainer', 'admin']),
    cohortId: z.number().int().optional(),
  })
  const data = schema.parse(req.body)
  if (await User.findOne({ where: { email: data.email } })) throw httpError(409, 'Email exists.')
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, 10),
    role: data.role,
    CohortId: data.cohortId ?? null,
  })
  res.status(201).json({ user: publicUser(user) })
})

export const updateUser = asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['learner', 'trainer', 'admin']).optional(),
    isActive: z.boolean().optional(),
    cohortId: z.number().int().nullable().optional(),
  })
  const user = await User.findByPk(req.params.id)
  if (!user) throw httpError(404, 'User not found.')
  const data = schema.parse(req.body)
  if (data.name !== undefined) user.name = data.name
  if (data.role !== undefined) user.role = data.role
  if (data.isActive !== undefined) user.isActive = data.isActive
  if (data.cohortId !== undefined) user.CohortId = data.cohortId
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

// ---- Cohorts ----
export const listCohorts = asyncHandler(async (_req, res) => {
  res.json({ cohorts: await Cohort.findAll() })
})

export const createCohort = asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().min(2), description: z.string().optional() })
  res.status(201).json({ cohort: await Cohort.create(schema.parse(req.body)) })
})

// ---- Badge rules ----
export const createBadge = asyncHandler(async (req, res) => {
  const schema = z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    description: z.string().optional(),
    criteria: z.object({ type: z.string() }).passthrough(),
  })
  res.status(201).json({ badge: await Badge.create(schema.parse(req.body)) })
})

// ---- Field tasks ----
export const createFieldTask = asyncHandler(async (req, res) => {
  const schema = z.object({
    moduleId: z.number().int(),
    title: z.string().min(2),
    description: z.string().optional(),
    points: z.number().int().optional(),
  })
  const data = schema.parse(req.body)
  const task = await FieldTask.create({
    ModuleId: data.moduleId,
    title: data.title,
    description: data.description,
    points: data.points ?? 50,
  })
  res.status(201).json({ task })
})
