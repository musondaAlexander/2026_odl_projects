import { z } from 'zod'
import { FieldTask, FieldTaskSubmission, User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'
import { awardPoints } from '../services/gamification.js'

// Learner submits photographic evidence of a real-world field task.
export const submitFieldTask = asyncHandler(async (req, res) => {
  const schema = z.object({ evidenceUrl: z.string().min(1), note: z.string().optional() })
  const task = await FieldTask.findByPk(req.params.id)
  if (!task) throw httpError(404, 'Field task not found.')
  const data = schema.parse(req.body)
  const submission = await FieldTaskSubmission.create({
    UserId: req.user.id,
    FieldTaskId: task.id,
    evidenceUrl: data.evidenceUrl,
    note: data.note,
    status: 'pending',
  })
  res.status(201).json({ submission })
})

// Trainer/admin reviews a submission. Verifying it awards XP (bridges learning↔practice).
export const reviewSubmission = asyncHandler(async (req, res) => {
  const schema = z.object({ status: z.enum(['verified', 'rejected']) })
  const { status } = schema.parse(req.body)
  const submission = await FieldTaskSubmission.findByPk(req.params.submissionId, {
    include: [FieldTask],
  })
  if (!submission) throw httpError(404, 'Submission not found.')
  if (submission.status !== 'pending') throw httpError(409, 'Already reviewed.')

  submission.status = status
  submission.reviewerId = req.user.id
  submission.reviewedAt = new Date()
  await submission.save()

  let reward = null
  if (status === 'verified') {
    reward = await awardPoints(submission.UserId, 'FIELD_TASK_VERIFIED', {
      points: submission.FieldTask.points,
      meta: { fieldTaskId: submission.FieldTaskId },
    })
  }
  res.json({ submission, reward })
})

// Trainer/admin: queue of pending submissions to review.
export const pendingSubmissions = asyncHandler(async (req, res) => {
  const submissions = await FieldTaskSubmission.findAll({
    where: { status: 'pending' },
    include: [FieldTask, { model: User, attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'ASC']],
  })
  res.json({ submissions })
})
