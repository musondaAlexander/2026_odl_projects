import { useEffect, useState } from 'react'
import { api } from '../api.js'

// Admin user management: list, create (any role), change role, activate/deactivate, delete.
export default function Admin() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'trainer' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const load = () => api.get('/admin/users').then(({ data }) => setUsers(data.users))
  useEffect(() => { load() }, [])

  async function createUser(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/users', form)
      setForm({ name: '', email: '', password: '', role: 'trainer' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed.')
    }
  }

  async function changeRole(u, role) { await api.patch(`/admin/users/${u.id}`, { role }); load() }
  async function toggleActive(u) { await api.patch(`/admin/users/${u.id}`, { isActive: !u.isActive }); load() }
  async function remove(u) { if (confirm(`Delete ${u.name}?`)) { await api.delete(`/admin/users/${u.id}`); load() } }

  return (
    <div className="container">
      <div className="card">
        <h1>Create user</h1>
        <form onSubmit={createUser} className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <input placeholder="Name" value={form.name} onChange={set('name')} />
          <input placeholder="Email" value={form.email} onChange={set('email')} />
          <input type="password" placeholder="Password" value={form.password} onChange={set('password')} />
          <select value={form.role} onChange={set('role')}>
            <option value="learner">learner</option>
            <option value="trainer">trainer</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit">Create</button>
        </form>
        {error && <p className="danger">{error}</p>}
      </div>

      <div className="card">
        <h1>All users ({users.length})</h1>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>XP</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}<div className="muted">{u.email}</div></td>
                <td>
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={{ width: 'auto' }}>
                    <option value="learner">learner</option>
                    <option value="trainer">trainer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{u.xp}</td>
                <td><span className={`pill ${u.isActive ? 'ok' : 'risk'}`}>{u.isActive ? 'active' : 'disabled'}</span></td>
                <td className="row">
                  <button className="secondary" onClick={() => toggleActive(u)}>{u.isActive ? 'Disable' : 'Enable'}</button>
                  <button className="secondary" onClick={() => remove(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
