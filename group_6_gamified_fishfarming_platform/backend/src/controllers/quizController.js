import { z } from 'zod'
import { Quiz, Question, QuizAttempt } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'
import { awardPoints } from '../services/gamification.js'

const submitSchema = z.object({
  // answers: { [questionId]: chosenIndex }
  answers: z.record(z.string(), z.number().int()),
})

// Auto-grade a quiz/scenario, persist the attempt, and award XP via the engine.
export const submitQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByPk(req.params.id, { include: [Question] })
  if (!quiz) throw httpError(404, 'Quiz not found.')

  const { answers } = submitSchema.parse(req.body)
  let earned = 0
  let total = 0
  const breakdown = quiz.Questions.map((q) => {
    total += q.points
    const correct = answers[String(q.id)] === q.correctIndex
    if (correct) earned += q.points
    return { questionId: q.id, correct, correctIndex: q.correctIndex }
  })
  const score = total > 0 ? Math.round((earned / total) * 100) : 0
  const passed = score >= quiz.passingScore

  await QuizAttempt.create({ UserId: req.user.id, QuizId: quiz.id, score, passed })

  let reward = { awarded: 0, totalXp: req.user.xp, newBadges: [] }
  if (passed) {
    const type = score === 100 ? 'QUIZ_PERFECT' : quiz.isScenario ? 'SCENARIO_COMPLETE' : 'QUIZ_PASS'
    reward = await awardPoints(req.user.id, type, { meta: { quizId: quiz.id, score } })
  }
  res.json({ score, passed, passingScore: quiz.passingScore, breakdown, reward })
})

// Trainer/admin: attach a quiz + questions to a lesson.
export const createQuiz = asyncHandler(async (req, res) => {
  const schema = z.object({
    lessonId: z.number().int(),
    title: z.string().min(2),
    passingScore: z.number().int().min(0).max(100).optional(),
    isScenario: z.boolean().optional(),
    questions: z
      .array(
        z.object({
          text: z.string().min(1),
          options: z.array(z.string()).min(2),
          correctIndex: z.number().int(),
          points: z.number().int().optional(),
        }),
      )
      .min(1),
  })
  const data = schema.parse(req.body)
  const quiz = await Quiz.create({
    LessonId: data.lessonId,
    title: data.title,
    passingScore: data.passingScore ?? 60,
    isScenario: data.isScenario ?? false,
  })
  await Question.bulkCreate(data.questions.map((q) => ({ ...q, QuizId: quiz.id })))
  const full = await Quiz.findByPk(quiz.id, { include: [Question] })
  res.status(201).json({ quiz: full })
})
