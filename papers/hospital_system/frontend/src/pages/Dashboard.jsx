import { useEffect, useState } from 'react'
import { api, authApi } from '../api.js'

export default function Dashboard() {
  const u = authApi.user()
  const [data, setData] = useState(null)

  useEffect(() => {
    if (u.role === 'admin') api.get('/dashboard/admin').then((r) => setData(r.data))
    else if (u.role === 'doctor') api.get('/dashboard/doctor').then((r) => setData(r.data))
    else api.get('/appointments').then((r) => setData(r.data))
  }, [])

  if (!data) return <div className="container"><p className="muted">Loading…</p></div>

  if (u.role === 'admin') return (
    <div className="container">
      <h1>Administrator dashboard</h1>
      <div className="grid">
        <Stat label="Total patients" value={data.totalPatients} />
        <Stat label="Today's appointments" value={data.todaysAppointments} />
        <Stat label="Appointment utilisation" value={data.appointmentUtilisation + '%'} />
        <Stat label="Outstanding billing" value={'K' + data.outstandingBilling} />
        <Stat label="Active staff" value={data.activeStaff} />
      </div>
    </div>
  )

  if (u.role === 'doctor') return (
    <div className="container">
      <h1>Doctor dashboard</h1>
      <div className="card">
        <h2>Today's schedule ({data.todaySchedule.length})</h2>
        <table><thead><tr><th>Time</th><th>Patient</th><th>Reason</th></tr></thead><tbody>
          {data.todaySchedule.map((a) => (
            <tr key={a.id}><td>{new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>{a.Patient?.fullName}</td><td>{a.reason}</td></tr>
          ))}
          {data.todaySchedule.length === 0 && <tr><td colSpan="3" className="muted">No appointments today.</td></tr>}
        </tbody></table>
      </div>
    </div>
  )

  // patient / nurse: their appointments
  return (
    <div className="container">
      <h1>My appointments</h1>
      <div className="card">
        <table><thead><tr><th>When</th><th>Doctor</th><th>Status</th></tr></thead><tbody>
          {data.appointments.map((a) => (
            <tr key={a.id}><td>{new Date(a.scheduledAt).toLocaleString()}</td>
              <td>{a.doctor?.name}</td><td><span className={`pill ${a.status === 'cancelled' ? 'bad' : 'ok'}`}>{a.status}</span></td></tr>
          ))}
          {data.appointments.length === 0 && <tr><td colSpan="3" className="muted">No appointments.</td></tr>}
        </tbody></table>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return <div className="card"><div className="muted">{label}</div><div className="stat">{value}</div></div>
}
