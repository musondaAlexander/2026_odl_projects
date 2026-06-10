import { Op } from 'sequelize'
import { Lesson, LessonProgress, QuizAttempt, User } from '../models/index.js'
import { asyncHandler } from '../middleware/error.js'

// Trainer/admin analytics dashboard: individual cards + cohort-level trends.
export const dashboard = asyncHandler(async (req, res) => {
  const totalLessons = await Lesson.count()

  // Individual learner cards.
  const learners = await User.findAll({
    where: { role: 'learner' },
    attributes: ['id', 'name', 'email', 'xp', 'lastActiveAt'],
    order: [['xp', 'DESC']],
  })

  const cards = await Promise.all(
    learners.map(async (u) => {
      const completed = await LessonProgress.count({ where: { UserId: u.id, completed: true } })
      const attempts = await QuizAttempt.findAll({ where: { UserId: u.id } })
      const quizAvg = attempts.length
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : null
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        xp: u.xp,
        completionRate: totalLessons ? Math.round((completed / totalLessons) * 100) : 0,
        quizAverage: quizAvg,
        lastActiveAt: u.lastActiveAt,
        atRisk: (quizAvg !== null && quizAvg < 50) || (!u.lastActiveAt),
      }
    }),
  )

  // Cohort-level aggregates.
  const cohort = {
    learners: learners.length,
    avgXp: learners.length ? Math.round(learners.reduce((s, u) => s + u.xp, 0) / learners.length) : 0,
    avgCompletion: cards.length
      ? Math.round(cards.reduce((s, c) => s + c.completionRate, 0) / cards.length)
      : 0,
    atRiskCount: cards.filter((c) => c.atRisk).length,
  }

  // Quiz score distribution (buckets) for a cohort chart.
  const allAttempts = await QuizAttempt.findAll({ attributes: ['score'] })
  const buckets = { '0-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 }
  for (const a of allAttempts) {
    if (a.score < 40) buckets['0-39']++
    else if (a.score < 60) buckets['40-59']++
    else if (a.score < 80) buckets['60-79']++
    else buckets['80-100']++
  }

  res.json({ cohort, scoreDistribution: buckets, learners: cards })
})

// Inactive-learner alerts (configurable threshold in days).
export const alerts = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7)
  const cutoff = new Date(Date.now() - days * 86400000)
  const inactive = await User.findAll({
    where: {
      role: 'learner',
      [Op.or]: [{ lastActiveAt: { [Op.lt]: cutoff } }, { lastActiveAt: null }],
    },
    attributes: ['id', 'name', 'email', 'lastActiveAt'],
  })
  res.json({ thresholdDays: days, inactive })
})
