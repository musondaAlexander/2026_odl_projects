// Seed a demonstrable dataset: roles, a cohort, the aquaculture curriculum,
// quizzes, field tasks, and badge rules.
import bcrypt from 'bcryptjs'
import {
  Badge, Cohort, FieldTask, Lesson, Module, Question, Quiz, User, sequelize,
} from '../models/index.js'

async function seed() {
  await sequelize.sync({ force: true })
  const pw = await bcrypt.hash('password123', 10)

  const cohort = await Cohort.create({ name: 'Ndola Pilot Cohort 2026', description: 'Pilot site cohort' })

  await User.create({ name: 'Platform Admin', email: 'admin@fishfarm.zm', passwordHash: pw, role: 'admin' })
  const trainer = await User.create({ name: 'Extension Officer Mwila', email: 'trainer@fishfarm.zm', passwordHash: pw, role: 'trainer' })
  const learners = await User.bulkCreate([
    { name: 'Bwalya Mutale', email: 'bwalya@farm.zm', passwordHash: pw, role: 'learner', CohortId: cohort.id, xp: 0 },
    { name: 'Chanda Phiri', email: 'chanda@farm.zm', passwordHash: pw, role: 'learner', CohortId: cohort.id, xp: 0 },
    { name: 'Nsofu Banda', email: 'nsofu@farm.zm', passwordHash: pw, role: 'learner', CohortId: cohort.id, xp: 0 },
  ])

  // Competency-based curriculum (aquaculture production cycle).
  const curriculum = [
    { competency: 'Pond Construction', title: 'Pond Siting & Construction',
      lessons: ['Choosing a pond site', 'Building and lining the pond'] },
    { competency: 'Water Quality', title: 'Water-Quality Management',
      lessons: ['Understanding dissolved oxygen', 'Monitoring pH and temperature'] },
    { competency: 'Stocking', title: 'Fingerling Selection & Stocking',
      lessons: ['Selecting healthy fingerlings', 'Stocking density'] },
    { competency: 'Feeding', title: 'Feed & Feeding Management',
      lessons: ['Feed types and storage', 'Feeding schedules'] },
    { competency: 'Health', title: 'Fish Health & Disease Management',
      lessons: ['Recognising common diseases', 'Preventive biosecurity'] },
  ]

  let order = 0
  for (const m of curriculum) {
    const module = await Module.create({ title: m.title, competency: m.competency, order: order++, published: true })
    let lo = 0
    for (const title of m.lessons) {
      const lesson = await Lesson.create({
        ModuleId: module.id, title, order: lo++,
        content: `# ${title}\n\nPractical guidance for ${m.competency.toLowerCase()} in small-scale Zambian aquaculture.`,
      })
      // First lesson of each module gets a quiz.
      if (lo === 1) {
        const quiz = await Quiz.create({ LessonId: lesson.id, title: `${m.competency} Check`, passingScore: 60 })
        await Question.bulkCreate([
          { QuizId: quiz.id, text: `Which is most important for ${m.competency.toLowerCase()}?`,
            options: ['Guesswork', 'Following best practice', 'Ignoring it', 'Asking nobody'], correctIndex: 1, points: 10 },
          { QuizId: quiz.id, text: 'How often should you monitor your pond?',
            options: ['Never', 'Once a year', 'Regularly', 'Only at harvest'], correctIndex: 2, points: 10 },
        ])
      }
    }
    await FieldTask.create({
      ModuleId: module.id, title: `Field task: ${m.competency}`,
      description: `Submit a photo demonstrating ${m.competency.toLowerCase()} at your pond.`, points: 100,
    })
  }

  await Badge.bulkCreate([
    { code: 'FIRST_STEPS', name: 'First Steps', description: 'Earn your first 20 XP', criteria: { type: 'xp_at_least', value: 20 } },
    { code: 'RISING_FARMER', name: 'Rising Farmer', description: 'Reach 200 XP', criteria: { type: 'xp_at_least', value: 200 } },
    { code: 'MASTER_FARMER', name: 'Master Farmer', description: 'Reach 500 XP', criteria: { type: 'xp_at_least', value: 500 } },
    { code: 'FIELD_PRO', name: 'Field Pro', description: 'Verify 3 field tasks', criteria: { type: 'activity_count', activity: 'FIELD_TASK_VERIFIED', value: 3 } },
  ])

  console.log('Seed complete.')
  console.log('  admin@fishfarm.zm / trainer@fishfarm.zm / bwalya@farm.zm  (password: password123)')
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
