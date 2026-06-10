import { Op } from 'sequelize'
import { z } from 'zod'
import { Appointment, Patient, User } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'

// Detect whether a doctor already has an overlapping appointment.
async function hasConflict(doctorId, startAt, durationMin, excludeId = null) {
  const start = new Date(startAt)
  const end = new Date(start.getTime() + durationMin * 60000)
  const where = { doctorId, status: 'booked' }
  if (excludeId) where.id = { [Op.ne]: excludeId }
  const sameDoctor = await Appointment.findAll({ where })
  return sameDoctor.some((a) => {
    const aStart = new Date(a.scheduledAt)
    const aEnd = new Date(aStart.getTime() + a.durationMin * 60000)
    return start < aEnd && aStart < end // overlap
  })
}

async function patientForUser(user) {
  return Patient.findOne({ where: { userId: user.id } })
}

export const book = asyncHandler(async (req, res) => {
  const schema = z.object({
    patientId: z.number().int().optional(),
    doctorId: z.number().int(),
    scheduledAt: z.string(),
    durationMin: z.number().int().min(5).max(240).optional(),
    reason: z.string().optional(),
  })
  const data = schema.parse(req.body)

  // Patients may only book for themselves.
  let patientId = data.patientId
  if (req.user.role === 'patient') {
    const p = await patientForUser(req.user)
    if (!p) throw httpError(400, 'No patient profile.')
    patientId = p.id
  }
  if (!patientId) throw httpError(400, 'patientId required.')

  const doctor = await User.findOne({ where: { id: data.doctorId, role: 'doctor' } })
  if (!doctor) throw httpError(404, 'Doctor not found.')

  const duration = data.durationMin || 30
  if (await hasConflict(data.doctorId, data.scheduledAt, duration)) {
    throw httpError(409, 'Doctor already has an appointment in that time slot.')
  }
  const appt = await Appointment.create({
    PatientId: patientId, doctorId: data.doctorId,
    scheduledAt: data.scheduledAt, durationMin: duration, reason: data.reason,
  })
  res.status(201).json({ appointment: appt })
})

export const list = asyncHandler(async (req, res) => {
  const where = {}
  if (req.user.role === 'doctor') where.doctorId = req.user.id
  if (req.user.role === 'patient') {
    const p = await patientForUser(req.user)
    where.PatientId = p ? p.id : -1
  }
  const appts = await Appointment.findAll({
    where,
    include: [
      { model: Patient, attributes: ['id', 'fullName'] },
      { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
    ],
    order: [['scheduledAt', 'ASC']],
  })
  res.json({ appointments: appts })
})

export const reschedule = asyncHandler(async (req, res) => {
  const appt = await Appointment.findByPk(req.params.id)
  if (!appt) throw httpError(404, 'Appointment not found.')
  if (req.user.role === 'patient') {
    const p = await patientForUser(req.user)
    if (!p || appt.PatientId !== p.id) throw httpError(403, 'Not your appointment.')
  }
  const schema = z.object({ scheduledAt: z.string().optional(), durationMin: z.number().int().optional() })
  const data = schema.parse(req.body)
  const when = data.scheduledAt || appt.scheduledAt
  const dur = data.durationMin || appt.durationMin
  if (await hasConflict(appt.doctorId, when, dur, appt.id)) throw httpError(409, 'Time slot conflict.')
  appt.scheduledAt = when
  appt.durationMin = dur
  await appt.save()
  res.json({ appointment: appt })
})

export const cancel = asyncHandler(async (req, res) => {
  const appt = await Appointment.findByPk(req.params.id)
  if (!appt) throw httpError(404, 'Appointment not found.')
  if (req.user.role === 'patient') {
    const p = await patientForUser(req.user)
    if (!p || appt.PatientId !== p.id) throw httpError(403, 'Not your appointment.')
  }
  appt.status = 'cancelled'
  await appt.save()
  res.json({ appointment: appt })
})
