import { Op, fn, col } from 'sequelize'
import { Appointment, Invoice, Patient, User } from '../models/index.js'
import { asyncHandler } from '../middleware/error.js'

function dayBounds() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)
  return { start, end }
}

// Administrator dashboard: utilisation, daily patient count, outstanding billing.
export const adminDashboard = asyncHandler(async (_req, res) => {
  const { start, end } = dayBounds()
  const totalPatients = await Patient.count()
  const todaysAppointments = await Appointment.count({ where: { scheduledAt: { [Op.between]: [start, end] } } })
  const booked = await Appointment.count({ where: { status: 'booked' } })
  const completed = await Appointment.count({ where: { status: 'completed' } })
  const utilisation = booked + completed > 0 ? Math.round((completed / (booked + completed)) * 100) : 0
  const outstanding = await Invoice.sum('amount', { where: { status: 'unpaid' } })
  const staff = await User.count({ where: { role: { [Op.in]: ['doctor', 'nurse'] } } })

  res.json({
    totalPatients,
    todaysAppointments,
    appointmentUtilisation: utilisation,
    outstandingBilling: Number(outstanding || 0),
    activeStaff: staff,
  })
})

// Doctor dashboard: today's schedule with patient names.
export const doctorDashboard = asyncHandler(async (req, res) => {
  const { start, end } = dayBounds()
  const schedule = await Appointment.findAll({
    where: { doctorId: req.user.id, scheduledAt: { [Op.between]: [start, end] } },
    include: [{ model: Patient, attributes: ['id', 'fullName'] }],
    order: [['scheduledAt', 'ASC']],
  })
  const upcoming = await Appointment.count({
    where: { doctorId: req.user.id, status: 'booked', scheduledAt: { [Op.gt]: end } },
  })
  res.json({ todaySchedule: schedule, upcomingCount: upcoming })
})
