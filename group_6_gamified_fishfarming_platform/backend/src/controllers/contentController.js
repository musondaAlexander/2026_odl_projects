import { z } from 'zod'
import { Lesson, LessonProgress, Module, Quiz, Question } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'
import { awardPoints } from '../services/gamification.js'

// ---- Learner/trainer: browse curriculum ----
export const listModules = asyncHandler(async (req, res) => {
  const modules = await Module.findAll({
    where: req.user.role === 'learner' ? { published: true } : {},
    include: [{ model: Lesson, attributes: ['id', 'title', 'order', 'videoUrl'] }],
    order: [['order', 'ASC'], [Lesson, 'order', 'ASC']],
  })
  res.json({ modules })
})

// Full lesson content (downloadable for offline study).
export const getLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.id, {
    include: [{ model: Quiz, include: [{ model: Question, attributes: ['id', 'text', 'options', 'points'] }] }],
  })
  if (!lesson) throw httpError(404, 'Lesson not found.')
  res.json({ lesson })
})

// Mark a lesson complete → award XP once.
export const completeLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.id)
  if (!lesson) throw httpError(404, 'Lesson not found.')
  const [progress, created] = await LessonProgress.findOrCreate({
    where: { UserId: req.user.id, LessonId: lesson.id },
    defaults: { completed: true, completedAt: new Date() },
  })
  let reward = { awarded: 0, totalXp: req.user.xp, newBadges: [] }
  if (!progress.completed) {
    progress.completed = true
    progress.completedAt = new Date()
    await progress.save()
  }
  if (created || !req.body._alreadyCounted) {
    reward = await awardPoints(req.user.id, 'LESSON_COMPLETE', { meta: { lessonId: lesson.id } })
  }
  res.json({ ok: true, reward })
})

// ---- Trainer/admin: author content ----
const moduleSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  competency: z.string().optional(),
  order: z.number().int().optional(),
  published: z.boolean().optional(),
})

export const createModule = asyncHandler(async (req, res) => {
  const data = moduleSchema.parse(req.body)
  const module = await Module.create(data)
  res.status(201).json({ module })
})

export const createLesson = asyncHandler(async (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    content: z.string().optional(),
    videoUrl: z.string().url().optional().or(z.literal('')),
    order: z.number().int().optional(),
  })
  const module = await Module.findByPk(req.params.moduleId)
  if (!module) throw httpError(404, 'Module not found.')
  const lesson = await Lesson.create({ ...schema.parse(req.body), ModuleId: module.id })
  res.status(201).json({ lesson })
})
