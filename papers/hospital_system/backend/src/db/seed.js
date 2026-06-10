// Seed demo users (one per role), patients, appointments, and an invoice.
import bcrypt from 'bcryptjs'
import { Appointment, Invoice, Patient, User, sequelize } from '../models/index.js'

async function seed() {
  await sequelize.sync({ force: true })
  const pw = await bcrypt.hash('password123', 10)

  const admin = await User.create({ name: 'Hospital Admin', email: 'admin@hospital.zm', passwordHash: pw, role: 'admin' })
  const doctor = await User.create({ name: 'Dr. Mwansa', email: 'doctor@hospital.zm', passwordHash: pw, role: 'doctor', specialization: 'General Medicine' })
  const doctor2 = await User.create({ name: 'Dr. Tembo', email: 'doctor2@hospital.zm', passwordHash: pw, role: 'doctor', specialization: 'Paediatrics' })
  const nurse = await User.create({ name: 'Nurse Banda', email: 'nurse@hospital.zm', passwordHash: pw, role: 'nurse' })
  const patientUser = await User.create({ name: 'Chanda Phiri', email: 'patient@hospital.zm', passwordHash: pw, role: 'patient', phone: '0970000000' })

  const p1 = await Patient.create({ userId: patientUser.id, fullName: 'Chanda Phiri', gender: 'male', phone: '0970000000', bloodGroup: 'O+' })
  const p2 = await Patient.create({ fullName: 'Mary Zulu', gender: 'female', phone: '0960000000', bloodGroup: 'A+' })

  const now = new Date()
  const at = (h) => { const d = new Date(now); d.setHours(h, 0, 0, 0); return d }
  await Appointment.create({ PatientId: p1.id, doctorId: doctor.id, scheduledAt: at(9), reason: 'Consultation' })
  await Appointment.create({ PatientId: p2.id, doctorId: doctor.id, scheduledAt: at(10), reason: 'Follow-up' })

  await Invoice.create({ PatientId: p1.id, amount: 350.0, description: 'Consultation fee' })

  console.log('Seed complete. Logins (password123):')
  console.log('  admin@hospital.zm / doctor@hospital.zm / nurse@hospital.zm / patient@hospital.zm')
  process.exit(0)
}
seed().catch((e) => { console.error(e); process.exit(1) })
