import { Op } from 'sequelize'
import { z } from 'zod'
import { MedicalRecord, Patient, User, VitalSign } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'

async function patientForUser(user) {
  return Patient.findOne({ where: { userId: user.id } })
}

// Nurse/Admin register a walk-in patient.
export const createPatient = asyncHandler(async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(2),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    nationalId: z.string().optional(),
    bloodGroup: z.string().optional(),
  })
  const patient = await Patient.create(schema.parse(req.body))
  res.status(201).json({ patient })
})

export const listPatients = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim()
  const where = q ? { fullName: { [Op.like]: `%${q}%` } } : {}
  const patients = await Patient.findAll({ where, order: [['fullName', 'ASC']], limit: 200 })
  res.json({ patients })
})

// Resolve which patient the requester may view (self for patients; any for staff).
async function resolvePatient(req) {
  if (req.user.role === 'patient') {
    const p = await patientForUser(req.user)
    if (!p || String(p.id) !== String(req.params.id)) throw httpError(403, 'Not your record.')
    return p
  }
  const p = await Patient.findByPk(req.params.id)
  if (!p) throw httpError(404, 'Patient not found.')
  return p
}

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await resolvePatient(req)
  const records = await MedicalRecord.findAll({
    where: { PatientId: patient.id },
    include: [{ model: User, as: 'author', attributes: ['id', 'name', 'role'] }],
    order: [['createdAt', 'DESC']],
  })
  const vitals = await VitalSign.findAll({ where: { PatientId: patient.id }, order: [['createdAt', 'DESC']], limit: 20 })
  res.json({ patient, records, vitals })
})

// Doctor adds a consultation/medical record.
export const addRecord = asyncHandler(async (req, res) => {
  const patient = await Patient.findByPk(req.params.id)
  if (!patient) throw httpError(404, 'Patient not found.')
  const schema = z.object({ diagnosis: z.string().optional(), notes: z.string().min(1) })
  const data = schema.parse(req.body)
  const record = await MedicalRecord.create({ ...data, PatientId: patient.id, authorId: req.user.id })
  res.status(201).json({ record })
})

// Nurse records vital signs.
export const addVitals = asyncHandler(async (req, res) => {
  const patient = await Patient.findByPk(req.params.id)
  if (!patient) throw httpError(404, 'Patient not found.')
  const schema = z.object({
    temperatureC: z.number().optional(),
    systolic: z.number().int().optional(),
    diastolic: z.number().int().optional(),
    pulseBpm: z.number().int().optional(),
    weightKg: z.number().optional(),
    notes: z.string().optional(),
  })
  const vitals = await VitalSign.create({ ...schema.parse(req.body), PatientId: patient.id, recordedById: req.user.id })
  res.status(201).json({ vitals })
})
