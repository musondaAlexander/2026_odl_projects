import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'doctor', specialization: '' })
  const [error, setError] = useState('')

  const load = () => api.get('/admin/users').then((r) => setUsers(r.data.users))
  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault(); setError('')
    try { await api.post('/admin/users', form); setForm({ name: '', email: '', password: '', role: 'doctor', specialization: '' }); load() }
    catch (err) { setError(err.response?.data?.error || 'Failed') }
  }
  const setRole = async (u, role) => { await api.patch(`/admin/users/${u.id}`, { role }); load() }
  const toggle = async (u) => { await api.patch(`/admin/users/${u.id}`, { isActive: !u.isActive }); load() }
  const remove = async (u) => { if (confirm(`Delete ${u.name}?`)) { await api.delete(`/admin/users/${u.id}`); load() } }

  return (
    <div className="container">
      <h1>User management</h1>
      <div className="card">
        <h2>Create user</h2>
        <form onSubmit={create} className="row" style={{ flexWrap: 'wrap' }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: 160 }} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: 200 }} />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ width: 150 }} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ width: 130 }}>
            <option value="doctor">doctor</option><option value="nurse">nurse</option><option value="admin">admin</option><option value="patient">patient</option>
          </select>
          <button type="submit">Create</button>
        </form>
        {error && <p className="danger">{error}</p>}
      </div>
      <div className="card">
        <h2>All users ({users.length})</h2>
        <table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}<div className="muted">{u.email}</div></td>
              <td><select value={u.role} onChange={(e) => setRole(u, e.target.value)} style={{ width: 'auto' }}>
                <option value="doctor">doctor</option><option value="nurse">nurse</option><option value="admin">admin</option><option value="patient">patient</option>
              </select></td>
              <td><span className={`pill ${u.isActive ? 'ok' : 'bad'}`}>{u.isActive ? 'active' : 'disabled'}</span></td>
              <td className="row">
                <button className="secondary" onClick={() => toggle(u)}>{u.isActive ? 'Disable' : 'Enable'}</button>
                <button className="secondary" onClick={() => remove(u)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  )
}
