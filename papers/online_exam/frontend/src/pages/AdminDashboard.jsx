import { useEffect, useState } from 'react'
import { api } from '../api.js'

const ROLES = ['STUDENT', 'LECTURER', 'ADMIN']
const NEW_USER = { fullName: '', email: '', password: '', role: 'LECTURER' }

export default function AdminDashboard() {
  const [dash, setDash] = useState(null)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(NEW_USER)
  const [error, setError] = useState('')

  async function load() {
    try {
      setDash(await api.get('/api/admin/dashboard'))
      setUsers(await api.get('/api/admin/users'))
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault()
    setError('')
    try { await api.post('/api/admin/users', form); setForm(NEW_USER); load() }
    catch (e) { setError(e.message) }
  }

  async function setRole(id, role) {
    try { await api.put(`/api/admin/users/${id}/role`, { role }); load() } catch (e) { setError(e.message) }
  }

  async function del(id) {
    try { await api.del(`/api/admin/users/${id}`); load() } catch (e) { setError(e.message) }
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {error && <div className="error">{error}</div>}

      {dash && (
        <div className="grid stats">
          <div className="stat"><div className="n">{dash.users}</div><div className="l">Users</div></div>
          <div className="stat"><div className="n">{dash.students}</div><div className="l">Students</div></div>
          <div className="stat"><div className="n">{dash.lecturers}</div><div className="l">Lecturers</div></div>
          <div className="stat"><div className="n">{dash.questions}</div><div className="l">Questions</div></div>
          <div className="stat"><div className="n">{dash.exams}</div><div className="l">Exams</div></div>
          <div className="stat"><div className="n">{dash.attempts}</div><div className="l">Attempts</div></div>
          <div className="stat"><div className="n">{dash.avgScore}%</div><div className="l">Avg score</div></div>
          <div className="stat"><div className="n">{dash.flagRate}%</div><div className="l">Plagiarism rate</div></div>
        </div>
      )}

      <h2>Create staff account</h2>
      <div className="card">
        <form onSubmit={create}>
          <div className="row">
            <div style={{ flex: 1 }}><label>Full name</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
            <div style={{ flex: 1 }}><label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}><label>Password</label>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <div style={{ flex: '0 0 160px' }}><label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select></div>
          </div>
          <div style={{ marginTop: 12 }}><button type="submit">Create account</button></div>
        </form>
      </div>

      <h2>Users</h2>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td className="muted">{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} style={{ width: 130 }}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td><button className="danger sm" onClick={() => del(u.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
