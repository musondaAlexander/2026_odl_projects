import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import * as auth from '../controllers/authController.js'
import * as patients from '../controllers/patientController.js'
import * as appts from '../controllers/appointmentController.js'
import * as billing from '../controllers/billingController.js'
import * as dash from '../controllers/dashboardController.js'
import * as admin from '../controllers/adminController.js'

const r = Router()

// Public auth
r.post('/auth/register', auth.register)
r.post('/auth/login', auth.login)
r.post('/auth/refresh', auth.refresh)

r.use(authenticate)
r.get('/auth/me', auth.me)

// Doctors directory (any authenticated user, for booking)
r.get('/doctors', admin.listDoctors)

// Patients & records
r.get('/patients', authorize('admin', 'doctor', 'nurse'), patients.listPatients)
r.post('/patients', authorize('admin', 'nurse'), patients.createPatient)
r.get('/patients/:id', patients.getPatient) // ownership enforced inside for patient role
r.post('/patients/:id/records', authorize('doctor'), patients.addRecord)
r.post('/patients/:id/vitals', authorize('nurse', 'doctor'), patients.addVitals)

// Appointments
r.get('/appointments', appts.list)
r.post('/appointments', authorize('admin', 'nurse', 'patient'), appts.book)
r.patch('/appointments/:id', appts.reschedule)
r.post('/appointments/:id/cancel', appts.cancel)

// Billing
r.get('/invoices', billing.listInvoices)
r.post('/invoices', authorize('admin'), billing.createInvoice)
r.post('/invoices/:id/pay', authorize('admin'), billing.payInvoice)

// Dashboards
r.get('/dashboard/admin', authorize('admin'), dash.adminDashboard)
r.get('/dashboard/doctor', authorize('doctor'), dash.doctorDashboard)

// Admin user management
r.get('/admin/users', authorize('admin'), admin.listUsers)
r.post('/admin/users', authorize('admin'), admin.createUser)
r.patch('/admin/users/:id', authorize('admin'), admin.updateUser)
r.delete('/admin/users/:id', authorize('admin'), admin.deleteUser)

export default r
