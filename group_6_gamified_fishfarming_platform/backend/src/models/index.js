import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// ---------------- Users & cohorts ----------------
export const Cohort = sequelize.define('Cohort', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
})

export const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('learner', 'trainer', 'admin'),
    allowNull: false,
    defaultValue: 'learner',
  },
  xp: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastActiveAt: { type: DataTypes.DATE },
})

// ---------------- Curriculum ----------------
export const Module = sequelize.define('Module', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  competency: { type: DataTypes.STRING }, // e.g. "Water Quality Management"
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  published: { type: DataTypes.BOOLEAN, defaultValue: true },
})

export const Lesson = sequelize.define('Lesson', {
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT }, // text/markdown, downloadable for offline
  videoUrl: { type: DataTypes.STRING },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
})

export const LessonProgress = sequelize.define('LessonProgress', {
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completedAt: { type: DataTypes.DATE },
})

// ---------------- Assessment ----------------
export const Quiz = sequelize.define('Quiz', {
  title: { type: DataTypes.STRING, allowNull: false },
  passingScore: { type: DataTypes.INTEGER, defaultValue: 60 }, // percent
  isScenario: { type: DataTypes.BOOLEAN, defaultValue: false },
})

export const Question = sequelize.define('Question', {
  text: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSON, allowNull: false }, // ["a","b","c","d"]
  correctIndex: { type: DataTypes.INTEGER, allowNull: false },
  points: { type: DataTypes.INTEGER, defaultValue: 10 },
})

export const QuizAttempt = sequelize.define('QuizAttempt', {
  score: { type: DataTypes.INTEGER, defaultValue: 0 }, // percent
  passed: { type: DataTypes.BOOLEAN, defaultValue: false },
})

// ---------------- Field practice ----------------
export const FieldTask = sequelize.define('FieldTask', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  points: { type: DataTypes.INTEGER, defaultValue: 50 },
})

export const FieldTaskSubmission = sequelize.define('FieldTaskSubmission', {
  evidenceUrl: { type: DataTypes.STRING }, // photographic evidence
  note: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending',
  },
  reviewedAt: { type: DataTypes.DATE },
})

// ---------------- Gamification ----------------
export const Badge = sequelize.define('Badge', {
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  // Rule the gamification engine evaluates, e.g. { type: 'xp_at_least', value: 500 }
  criteria: { type: DataTypes.JSON, allowNull: false },
})

export const UserBadge = sequelize.define('UserBadge', {
  awardedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
})

// XP/activity ledger — drives leaderboard and analytics.
export const ActivityLog = sequelize.define('ActivityLog', {
  type: { type: DataTypes.STRING, allowNull: false }, // LESSON_COMPLETE, QUIZ_PASS, ...
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  meta: { type: DataTypes.JSON },
})

// ---------------- Associations ----------------
Cohort.hasMany(User); User.belongsTo(Cohort)

Module.hasMany(Lesson, { onDelete: 'CASCADE' }); Lesson.belongsTo(Module)
Module.hasMany(FieldTask, { onDelete: 'CASCADE' }); FieldTask.belongsTo(Module)

Lesson.hasOne(Quiz, { onDelete: 'CASCADE' }); Quiz.belongsTo(Lesson)
Quiz.hasMany(Question, { onDelete: 'CASCADE' }); Question.belongsTo(Quiz)

User.belongsToMany(Lesson, { through: LessonProgress }); Lesson.belongsToMany(User, { through: LessonProgress })
LessonProgress.belongsTo(User); LessonProgress.belongsTo(Lesson)

User.hasMany(QuizAttempt); QuizAttempt.belongsTo(User)
Quiz.hasMany(QuizAttempt); QuizAttempt.belongsTo(Quiz)

User.hasMany(FieldTaskSubmission); FieldTaskSubmission.belongsTo(User)
FieldTask.hasMany(FieldTaskSubmission); FieldTaskSubmission.belongsTo(FieldTask)
FieldTaskSubmission.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewerId' })

User.belongsToMany(Badge, { through: UserBadge }); Badge.belongsToMany(User, { through: UserBadge })
UserBadge.belongsTo(User); UserBadge.belongsTo(Badge)

User.hasMany(ActivityLog); ActivityLog.belongsTo(User)

export { sequelize }
