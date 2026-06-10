import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api.js'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await authApi.register(form.name, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h1>Register as a learner</h1>
        <form onSubmit={onSubmit}>
          <input placeholder="Full name" value={form.name} onChange={set('name')} />
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} />
          <input type="password" placeholder="Password (min 8)" value={form.password} onChange={set('password')} />
          {error && <p className="danger">{error}</p>}
          <button type="submit">Create account</button>
        </form>
        <p className="muted">Have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
