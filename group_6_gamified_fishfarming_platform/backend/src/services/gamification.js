// Gamification engine: awards XP for measurable learning activities, evaluates
// badge-unlock rules after every scoring event, and exposes leaderboard data.
// Points are awarded ONLY for learning-relevant activities (proposal §2.2.1).
import { ActivityLog, Badge, User, UserBadge } from '../models/index.js'

export const POINT_RULES = {
  LESSON_COMPLETE: 20,
  QUIZ_PASS: 50,
  QUIZ_PERFECT: 80,
  SCENARIO_COMPLETE: 60,
  FIELD_TASK_VERIFIED: 100,
  LOGIN_STREAK: 10,
}

// Award points for an activity, update the user's XP, log it, then re-check badges.
export async function awardPoints(userId, type, { points, meta } = {}) {
  const award = points ?? POINT_RULES[type] ?? 0
  await ActivityLog.create({ UserId: userId, type, points: award, meta: meta || null })
  if (award > 0) {
    await User.increment('xp', { by: award, where: { id: userId } })
  }
  const newlyAwarded = await evaluateBadges(userId)
  const user = await User.findByPk(userId)
  return { awarded: award, totalXp: user.xp, newBadges: newlyAwarded }
}

// Evaluate every badge's criteria against the user's current state.
export async function evaluateBadges(userId) {
  const user = await User.findByPk(userId)
  const badges = await Badge.findAll()
  const owned = new Set((await UserBadge.findAll({ where: { UserId: userId } })).map((b) => b.BadgeId))
  const newly = []

  for (const badge of badges) {
    if (owned.has(badge.id)) continue
    if (await criteriaMet(user, badge.criteria)) {
      await UserBadge.create({ UserId: userId, BadgeId: badge.id })
      newly.push({ code: badge.code, name: badge.name })
    }
  }
  return newly
}

async function criteriaMet(user, criteria) {
  switch (criteria?.type) {
    case 'xp_at_least':
      return user.xp >= criteria.value
    case 'activity_count': {
      const count = await ActivityLog.count({
        where: { UserId: user.id, type: criteria.activity },
      })
      return count >= criteria.value
    }
    default:
      return false
  }
}

// Cohort leaderboard ranked by XP.
export async function getLeaderboard({ cohortId, limit = 50 } = {}) {
  const where = { role: 'learner', isActive: true }
  if (cohortId) where.CohortId = cohortId
  const users = await User.findAll({
    where,
    order: [['xp', 'DESC']],
    limit,
    attributes: ['id', 'name', 'xp', 'CohortId'],
  })
  return users.map((u, i) => ({ rank: i + 1, id: u.id, name: u.name, xp: u.xp }))
}
