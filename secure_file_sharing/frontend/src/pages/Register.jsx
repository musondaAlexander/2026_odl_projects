import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../api/client.js'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await auth.register(form.username, form.email, form.password)
      await auth.login(form.username, form.password)
      navigate('/keys') // first step after register: generate identity key
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Registration failed.')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Create account</h1>
        <form onSubmit={onSubmit}>
          <input placeholder="Username" value={form.username} onChange={set('username')} />
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} />
          <input type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={set('password')} />
          {error && <p className="danger">{error}</p>}
          <button type="submit">Register</button>
        </form>
        <p className="muted">Have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
