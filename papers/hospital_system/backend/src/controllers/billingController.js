import { z } from 'zod'
import { Invoice, Patient, Payment } from '../models/index.js'
import { asyncHandler, httpError } from '../middleware/error.js'

async function patientForUser(user) {
  const { Patient } = await import('../models/index.js')
  return Patient.findOne({ where: { userId: user.id } })
}

// Admin issues an invoice for a patient.
export const createInvoice = asyncHandler(async (req, res) => {
  const schema = z.object({
    patientId: z.number().int(),
    amount: z.number().positive(),
    description: z.string().optional(),
  })
  const data = schema.parse(req.body)
  const patient = await Patient.findByPk(data.patientId)
  if (!patient) throw httpError(404, 'Patient not found.')
  const invoice = await Invoice.create({
    PatientId: patient.id, amount: data.amount, description: data.description,
  })
  res.status(201).json({ invoice })
})

export const listInvoices = asyncHandler(async (req, res) => {
  const where = {}
  if (req.user.role === 'patient') {
    const p = await patientForUser(req.user)
    where.PatientId = p ? p.id : -1
  }
  const invoices = await Invoice.findAll({
    where,
    include: [{ model: Patient, attributes: ['id', 'fullName'] }, { model: Payment }],
    order: [['createdAt', 'DESC']],
  })
  res.json({ invoices })
})

// Admin records a payment and marks the invoice paid when fully settled.
export const payInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id, { include: [Payment] })
  if (!invoice) throw httpError(404, 'Invoice not found.')
  const schema = z.object({
    amount: z.number().positive(),
    method: z.enum(['cash', 'card', 'mobile_money']).optional(),
  })
  const data = schema.parse(req.body)
  await Payment.create({
    InvoiceId: invoice.id, amount: data.amount, method: data.method || 'cash', receivedById: req.user.id,
  })
  const payments = await Payment.findAll({ where: { InvoiceId: invoice.id } })
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  if (totalPaid >= Number(invoice.amount)) {
    invoice.status = 'paid'
    await invoice.save()
  }
  res.json({ invoice, totalPaid })
})
