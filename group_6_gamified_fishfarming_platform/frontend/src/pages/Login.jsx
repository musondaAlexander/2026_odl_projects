import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await authApi.login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.')
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h1>Sign in</h1>
        <form onSubmit={onSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="danger">{error}</p>}
          <button type="submit">Sign in</button>
        </form>
        <p className="muted">New farmer? <Link to="/register">Register</Link></p>
        <p className="muted">Demo: admin@fishfarm.zm / trainer@fishfarm.zm / bwalya@farm.zm — <code>password123</code></p>
      </div>
    </div>
  )
}
