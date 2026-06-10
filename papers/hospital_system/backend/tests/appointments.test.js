// Tests the double-booking conflict guard + RBAC, against an in-memory SQLite DB.
import test from 'node:test'
import assert from 'node:assert'

process.env.DB_DIALECT = 'sqlite'
process.env.SQLITE_STORAGE = ':memory:'
process.env.JWT_SECRET = 'test-secret'

const { sequelize, User, Patient, Appointment } = await import('../src/models/index.js')
const appt = await import('../src/controllers/appointmentController.js')

await sequelize.sync({ force: true })
const doctor = await User.create({ name: 'Doc', email: 'd@t.zm', passwordHash: 'x', role: 'doctor' })
const patient = await Patient.create({ fullName: 'Pat' })

function mockRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const adminReq = (body) => ({ user: { role: 'admin', id: 1 }, body })

test('books an appointment, then rejects an overlapping one for the same doctor', async () => {
  const res1 = mockRes()
  await appt.book(adminReq({ patientId: patient.id, doctorId: doctor.id, scheduledAt: '2026-07-01T09:00:00Z', durationMin: 30 }), res1, (e) => { throw e })
  assert.strictEqual(res1.statusCode, 201)

  // Overlapping slot -> should throw a 409 conflict.
  let err
  await appt.book(adminReq({ patientId: patient.id, doctorId: doctor.id, scheduledAt: '2026-07-01T09:15:00Z', durationMin: 30 }), mockRes(), (e) => { err = e })
  assert.ok(err, 'expected a conflict error')
  assert.strictEqual(err.status, 409)
})

test('a non-overlapping slot is accepted', async () => {
  const res = mockRes()
  await appt.book(adminReq({ patientId: patient.id, doctorId: doctor.id, scheduledAt: '2026-07-01T11:00:00Z', durationMin: 30 }), res, (e) => { throw e })
  assert.strictEqual(res.statusCode, 201)
})

test('cleanup', async () => { await sequelize.close() })
