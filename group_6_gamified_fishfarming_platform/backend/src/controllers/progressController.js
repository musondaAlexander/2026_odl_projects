import { ActivityLog, Badge, Lesson, LessonProgress, Module, QuizAttempt, User, UserBadge } from '../models/index.js'
import { asyncHandler } from '../middleware/error.js'
import { getLeaderboard } from '../services/gamification.js'

// Learner dashboard: XP, badges, rank, completion %, quiz history.
export const myProgress = asyncHandler(async (req, res) => {
  const userId = req.user.id

  const totalLessons = await Lesson.count()
  const completed = await LessonProgress.count({ where: { UserId: userId, completed: true } })
  const badges = await UserBadge.findAll({ where: { UserId: userId }, include: [Badge] })
  const attempts = await QuizAttempt.findAll({
    where: { UserId: userId },
    order: [['createdAt', 'DESC']],
    limit: 20,
  })

  const board = await getLeaderboard({ cohortId: req.user.CohortId, limit: 1000 })
  const rank = board.find((r) => r.id === userId)?.rank ?? null

  res.json({
    xp: req.user.xp,
    rank,
    completion: totalLessons ? Math.round((completed / totalLessons) * 100) : 0,
    completedLessons: completed,
    totalLessons,
    badges: badges.map((b) => ({ code: b.Badge.code, name: b.Badge.name, awardedAt: b.awardedAt })),
    quizHistory: attempts.map((a) => ({ quizId: a.QuizId, score: a.score, passed: a.passed, at: a.createdAt })),
  })
})

export const leaderboard = asyncHandler(async (req, res) => {
  const board = await getLeaderboard({ cohortId: req.query.cohortId, limit: 50 })
  res.json({ leaderboard: board })
})

export const allBadges = asyncHandler(async (_req, res) => {
  const badges = await Badge.findAll({ attributes: ['code', 'name', 'description', 'criteria'] })
  res.json({ badges })
})
