import { useEffect, useState } from 'react'
import { api, authApi } from '../api.js'

export default function Appointments() {
  const u = authApi.user()
  const [appts, setAppts] = useState([])
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({ doctorId: '', scheduledAt: '', reason: '' })
  const [msg, setMsg] = useState('')

  async function load() {
    const [{ data: a }, { data: d }] = await Promise.all([api.get('/appointments'), api.get('/doctors')])
    setAppts(a.appointments); setDoctors(d.doctors)
  }
  useEffect(() => { load() }, [])

  async function book(e) {
    e.preventDefault(); setMsg('')
    try {
      await api.post('/appointments', { doctorId: Number(form.doctorId), scheduledAt: form.scheduledAt, reason: form.reason })
      setMsg('✓ Booked'); setForm({ doctorId: '', scheduledAt: '', reason: '' }); load()
    } catch (err) { setMsg('✗ ' + (err.response?.data?.error || 'Failed')) }
  }
  async function cancel(id) { await api.post(`/appointments/${id}/cancel`); load() }

  const canBook = ['patient', 'admin', 'nurse'].includes(u.role)

  return (
    <div className="container">
      <h1>Appointments</h1>
      {canBook && (
        <div className="card">
          <h2>Book an appointment</h2>
          <form onSubmit={book} className="row" style={{ flexWrap: 'wrap' }}>
            <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} style={{ width: 220 }}>
              <option value="">Select doctor…</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
            </select>
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} style={{ width: 230 }} />
            <input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ width: 200 }} />
            <button type="submit" disabled={!form.doctorId || !form.scheduledAt}>Book</button>
          </form>
          {msg && <p className={msg.startsWith('✗') ? 'danger' : 'ok'}>{msg}</p>}
        </div>
      )}
      <div className="card">
        <table><thead><tr><th>When</th><th>Patient</th><th>Doctor</th><th>Status</th><th></th></tr></thead><tbody>
          {appts.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.scheduledAt).toLocaleString()}</td>
              <td>{a.Patient?.fullName}</td><td>{a.doctor?.name}</td>
              <td><span className={`pill ${a.status === 'cancelled' ? 'bad' : 'ok'}`}>{a.status}</span></td>
              <td>{a.status === 'booked' && <button className="secondary" onClick={() => cancel(a.id)}>Cancel</button>}</td>
            </tr>
          ))}
          {appts.length === 0 && <tr><td colSpan="5" className="muted">No appointments.</td></tr>}
        </tbody></table>
      </div>
    </div>
  )
}
