import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import * as auth from '../controllers/authController.js'
import * as content from '../controllers/contentController.js'
import * as quiz from '../controllers/quizController.js'
import * as field from '../controllers/fieldTaskController.js'
import * as progress from '../controllers/progressController.js'
import * as analytics from '../controllers/analyticsController.js'
import * as admin from '../controllers/adminController.js'

const r = Router()

// ---- Public auth ----
r.post('/auth/register', auth.register)
r.post('/auth/login', auth.login)

// Everything below requires authentication.
r.use(authenticate)
r.get('/auth/me', auth.me)

// ---- Curriculum (all roles read; trainers/admins author) ----
r.get('/modules', content.listModules)
r.get('/lessons/:id', content.getLesson)
r.post('/lessons/:id/complete', authorize('learner'), content.completeLesson)
r.post('/modules', authorize('trainer', 'admin'), content.createModule)
r.post('/modules/:moduleId/lessons', authorize('trainer', 'admin'), content.createLesson)

// ---- Quizzes ----
r.post('/quizzes/:id/submit', authorize('learner'), quiz.submitQuiz)
r.post('/quizzes', authorize('trainer', 'admin'), quiz.createQuiz)

// ---- Field tasks ----
r.post('/field-tasks/:id/submit', authorize('learner'), field.submitFieldTask)
r.get('/field-tasks/submissions/pending', authorize('trainer', 'admin'), field.pendingSubmissions)
r.post('/field-tasks/submissions/:submissionId/review', authorize('trainer', 'admin'), field.reviewSubmission)

// ---- Gamification / learner dashboard ----
r.get('/me/progress', progress.myProgress)
r.get('/leaderboard', progress.leaderboard)
r.get('/badges', progress.allBadges)

// ---- Trainer analytics ----
r.get('/analytics/dashboard', authorize('trainer', 'admin'), analytics.dashboard)
r.get('/analytics/alerts', authorize('trainer', 'admin'), analytics.alerts)

// ---- Admin ----
r.get('/admin/users', authorize('admin'), admin.listUsers)
r.post('/admin/users', authorize('admin'), admin.createUser)
r.patch('/admin/users/:id', authorize('admin'), admin.updateUser)
r.delete('/admin/users/:id', authorize('admin'), admin.deleteUser)
r.get('/admin/cohorts', authorize('admin', 'trainer'), admin.listCohorts)
r.post('/admin/cohorts', authorize('admin'), admin.createCohort)
r.post('/admin/badges', authorize('admin'), admin.createBadge)
r.post('/admin/field-tasks', authorize('trainer', 'admin'), admin.createFieldTask)

export default r
