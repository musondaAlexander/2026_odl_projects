import { useEffect, useState } from 'react'
import { api, authApi } from '../api.js'

export default function Patients() {
  const u = authApi.user()
  const [patients, setPatients] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ fullName: '', gender: 'male', phone: '' })
  const [note, setNote] = useState({ diagnosis: '', notes: '' })

  async function load() { const { data } = await api.get('/patients', { params: { q } }); setPatients(data.patients) }
  useEffect(() => { load() }, [q])

  async function open(p) {
    setSelected(p)
    const { data } = await api.get(`/patients/${p.id}`)
    setDetail(data)
  }
  async function register(e) {
    e.preventDefault()
    await api.post('/patients', form)
    setForm({ fullName: '', gender: 'male', phone: '' }); load()
  }
  async function addRecord(e) {
    e.preventDefault()
    await api.post(`/patients/${selected.id}/records`, note)
    setNote({ diagnosis: '', notes: '' }); open(selected)
  }

  return (
    <div className="container">
      <h1>Patients</h1>
      {['admin', 'nurse'].includes(u.role) && (
        <div className="card">
          <h2>Register patient</h2>
          <form onSubmit={register} className="row" style={{ flexWrap: 'wrap' }}>
            <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={{ width: 220 }} />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={{ width: 130 }}>
              <option>male</option><option>female</option><option>other</option>
            </select>
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ width: 160 }} />
            <button type="submit" disabled={!form.fullName}>Register</button>
          </form>
        </div>
      )}
      <div className="card">
        <input placeholder="Search patients…" value={q} onChange={(e) => setQ(e.target.value)} />
        <table><thead><tr><th>Name</th><th>Gender</th><th>Phone</th><th></th></tr></thead><tbody>
          {patients.map((p) => (
            <tr key={p.id}><td>{p.fullName}</td><td>{p.gender}</td><td>{p.phone}</td>
              <td><button className="secondary" onClick={() => open(p)}>Open</button></td></tr>
          ))}
        </tbody></table>
      </div>
      {detail && (
        <div className="card">
          <h2>{detail.patient.fullName} — record</h2>
          {u.role === 'doctor' && (
            <form onSubmit={addRecord} className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Diagnosis" value={note.diagnosis} onChange={(e) => setNote({ ...note, diagnosis: e.target.value })} style={{ width: 200 }} />
              <input placeholder="Notes" value={note.notes} onChange={(e) => setNote({ ...note, notes: e.target.value })} style={{ width: 260 }} />
              <button type="submit" disabled={!note.notes}>Add note</button>
            </form>
          )}
          <h2>History</h2>
          {detail.records.map((r) => (
            <div key={r.id} className="muted">• {r.diagnosis ? <b>{r.diagnosis}: </b> : ''}{r.notes} <i>({r.author?.name})</i></div>
          ))}
          {detail.records.length === 0 && <p className="muted">No records yet.</p>}
        </div>
      )}
    </div>
  )
}
