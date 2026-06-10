import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../api/client.js'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await auth.login(username, password)
      navigate('/inbox')
    } catch {
      setError('Invalid username or password.')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Sign in</h1>
        <form onSubmit={onSubmit}>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="danger">{error}</p>}
          <button type="submit">Sign in</button>
        </form>
        <p className="muted">No account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  )
}
