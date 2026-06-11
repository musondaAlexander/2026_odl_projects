import { useState } from 'react'
import { useAuth } from '../auth.jsx'

const DEMO = [
  ['admin@exam.zm', 'Admin'],
  ['lecturer@exam.zm', 'Lecturer'],
  ['student1@exam.zm', 'Student'],
]

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('student1@exam.zm')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(fullName, email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1 className="center">Online Exam &amp; Plagiarism Detection</h1>
        <p className="muted center">Zambia University College of Technology</p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </>
          )}
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 14 }}>
            <button type="submit" disabled={busy}>
              {busy ? '...' : mode === 'login' ? 'Sign in' : 'Create student account'}
            </button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
          {mode === 'login' ? (
            <>New student? <a href="#" onClick={(e) => { e.preventDefault(); setMode('register') }}>Register</a></>
          ) : (
            <>Have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login') }}>Sign in</a></>
          )}
        </p>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Demo accounts (password <code>password123</code>):
          <div className="row" style={{ marginTop: 6 }}>
            {DEMO.map(([e, label]) => (
              <button key={e} className="ghost sm" type="button"
                onClick={() => { setEmail(e); setPassword('password123'); setMode('login') }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
