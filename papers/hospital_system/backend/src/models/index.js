import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

// ---------- Users & roles ----------
export const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('admin', 'doctor', 'nurse', 'patient'),
    allowNull: false,
    defaultValue: 'patient',
  },
  phone: { type: DataTypes.STRING },
  specialization: { type: DataTypes.STRING }, // doctors
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
})

// ---------- Patient profile ----------
// A patient profile may be linked to a login User (self-registered) or created
// by a nurse for a walk-in (userId null).
export const Patient = sequelize.define('Patient', {
  fullName: { type: DataTypes.STRING, allowNull: false },
  dateOfBirth: { type: DataTypes.DATEONLY },
  gender: { type: DataTypes.ENUM('male', 'female', 'other') },
  phone: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  nationalId: { type: DataTypes.STRING },
  bloodGroup: { type: DataTypes.STRING },
})

// ---------- Appointments ----------
export const Appointment = sequelize.define('Appointment', {
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  durationMin: { type: DataTypes.INTEGER, defaultValue: 30 },
  reason: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM('booked', 'completed', 'cancelled'),
    defaultValue: 'booked',
  },
})

// ---------- Medical records ----------
export const MedicalRecord = sequelize.define('MedicalRecord', {
  diagnosis: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
})

export const VitalSign = sequelize.define('VitalSign', {
  temperatureC: { type: DataTypes.FLOAT },
  systolic: { type: DataTypes.INTEGER },
  diastolic: { type: DataTypes.INTEGER },
  pulseBpm: { type: DataTypes.INTEGER },
  weightKg: { type: DataTypes.FLOAT },
  notes: { type: DataTypes.STRING },
})

// ---------- Billing ----------
export const Invoice = sequelize.define('Invoice', {
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  description: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('unpaid', 'paid', 'cancelled'), defaultValue: 'unpaid' },
})

export const Payment = sequelize.define('Payment', {
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  method: { type: DataTypes.ENUM('cash', 'card', 'mobile_money'), defaultValue: 'cash' },
  paidAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
})

// ---------- Associations ----------
User.hasOne(Patient, { foreignKey: 'userId' }); Patient.belongsTo(User, { foreignKey: 'userId' })

// Appointment: patient + doctor (a doctor is a User with role 'doctor')
Patient.hasMany(Appointment); Appointment.belongsTo(Patient)
User.hasMany(Appointment, { as: 'doctorAppointments', foreignKey: 'doctorId' })
Appointment.belongsTo(User, { as: 'doctor', foreignKey: 'doctorId' })

Patient.hasMany(MedicalRecord); MedicalRecord.belongsTo(Patient)
MedicalRecord.belongsTo(User, { as: 'author', foreignKey: 'authorId' })

Patient.hasMany(VitalSign); VitalSign.belongsTo(Patient)
VitalSign.belongsTo(User, { as: 'recordedBy', foreignKey: 'recordedById' })

Patient.hasMany(Invoice); Invoice.belongsTo(Patient)
Invoice.hasMany(Payment); Payment.belongsTo(Invoice)
Payment.belongsTo(User, { as: 'receivedBy', foreignKey: 'receivedById' })

export { sequelize }
