import { useState } from 'react'
import axios from 'axios'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const ROLES = ['direct_identifier', 'quasi_identifier', 'sensitive', 'non_sensitive']

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pa.token') || '')
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('pa.user') || 'null'))

  if (!token) return <Login onAuth={(t, u) => { setToken(t); setUser(u); localStorage.setItem('pa.token', t); localStorage.setItem('pa.user', JSON.stringify(u)) }} />
  return <Workspace token={token} user={user} onLogout={() => { localStorage.clear(); setToken('') }} />
}

function Login({ onAuth }) {
  const [email, setEmail] = useState('analyst@privacy.zm')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setError('')
    try {
      const body = new URLSearchParams({ username: email, password })
      const { data } = await axios.post(`${API}/api/auth/login`, body)
      onAuth(data.access_token, data.user)
    } catch { setError('Invalid credentials') }
  }
  return (
    <div className="center">
      <form className="card" style={{ width: 380 }} onSubmit={submit}>
        <h1>🔐 Privacy Analytics</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="danger">{error}</p>}
        <button type="submit">Sign in</button>
        <p className="muted">Demo: admin@privacy.zm / analyst@privacy.zm — password123</p>
      </form>
    </div>
  )
}

function Workspace({ token, user, onLogout }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } }
  const [upload, setUpload] = useState(null)
  const [cls, setCls] = useState({})
  const [eps, setEps] = useState(1.0)
  const [k, setK] = useState(5)
  const [report, setReport] = useState(null)
  const [resultId, setResultId] = useState(null)
  const [curve, setCurve] = useState(null)
  const [busy, setBusy] = useState(false)

  async function doUpload(e) {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const { data } = await axios.post(`${API}/api/datasets/upload`, fd, auth)
    setUpload(data); setReport(null); setCurve(null)
    setCls(Object.fromEntries(data.columns.map((c) => [c.name, c.suggestedRole])))
  }

  async function anonymize() {
    setBusy(true)
    try {
      const { data } = await axios.post(`${API}/api/anonymize`,
        { fileId: upload.fileId, classification: cls, epsilon: Number(eps), k: Number(k) }, auth)
      setReport(data.report); setResultId(data.resultId)
    } finally { setBusy(false) }
  }

  async function download() {
    const res = await axios.get(`${API}/api/anonymize/${resultId}/download`, { ...auth, responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href = url; a.download = 'anonymized.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function showCurve() {
    const sensitive = Object.entries(cls).find(([, r]) => r === 'sensitive')
    if (!sensitive) return
    const { data } = await axios.get(`${API}/api/utility-curve`, { ...auth, params: { fileId: upload.fileId, column: sensitive[0] } })
    setCurve(data)
  }

  return (
    <>
      <nav className="nav">
        <strong>🔐 Privacy Analytics</strong>
        <span className="spacer" />
        <span className="muted">{user?.name} · {user?.role}</span>
        <button className="secondary" onClick={onLogout}>Logout</button>
      </nav>
      <div className="container">
        <div className="card">
          <h1>1 · Upload dataset</h1>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={doUpload} />
          {upload && <p className="muted">{upload.rows} rows · {upload.columns.length} columns</p>}
        </div>

        {upload && (
          <div className="card">
            <h1>2 · Classify columns</h1>
            <table><thead><tr><th>Column</th><th>Type</th><th>Role</th></tr></thead><tbody>
              {upload.columns.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td><td className="muted">{c.dtype}</td>
                  <td><select value={cls[c.name]} onChange={(e) => setCls({ ...cls, [c.name]: e.target.value })} style={{ width: 'auto' }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}

        {upload && (
          <div className="card">
            <h1>3 · Privacy budget</h1>
            <div className="row">
              <div><label>Epsilon (ε)</label><input type="number" step="0.1" min="0.1" value={eps} onChange={(e) => setEps(e.target.value)} style={{ width: 120 }} /></div>
              <div><label>k (anonymity)</label><input type="number" min="2" value={k} onChange={(e) => setK(e.target.value)} style={{ width: 120 }} /></div>
              <button onClick={anonymize} disabled={busy}>Anonymise</button>
              <button className="secondary" onClick={showCurve}>Show utility curve</button>
            </div>
          </div>
        )}

        {curve && (
          <div className="card">
            <h2>Privacy–utility trade-off ({curve.column})</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={curve.points}>
                <XAxis dataKey="epsilon" stroke="#94a3b8" label={{ value: 'ε', position: 'insideBottom' }} />
                <YAxis stroke="#94a3b8" domain={[0, 1]} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#a78bfa" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {report && (
          <div className="card">
            <h1>4 · Compliance report</h1>
            <p><span className="tag">ε={report.epsilon_applied}</span> <span className="tag">k={report.k_enforced}</span>{' '}
              <span className="pill-ok">{report.k_compliant ? '✓ k-compliant' : '✗ not compliant'}</span></p>
            <p>Records suppressed: <b>{report.records_suppressed}</b> · Information loss: <b>{report.information_loss_percent}%</b></p>
            {report.statements.map((s, i) => <p key={i} className="muted">• {s}</p>)}
            <p className="muted"><i>{report.privacy_guarantee}</i></p>
            <button onClick={download}>Download anonymised CSV</button>
          </div>
        )}
      </div>
    </>
  )
}
