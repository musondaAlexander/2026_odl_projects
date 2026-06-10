import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setError('')
    try { await authApi.login(email, password); navigate('/') }
    catch (err) { setError(err.response?.data?.error || 'Login failed.') }
  }

  return (
    <div className="center">
      <form className="card" style={{ width: 380 }} onSubmit={submit}>
        <h1>🏥 Sign in</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="danger">{error}</p>}
        <button type="submit">Sign in</button>
        <p className="muted">Demo (password123): admin@ / doctor@ / nurse@ / patient@hospital.zm</p>
      </form>
    </div>
  )
}
