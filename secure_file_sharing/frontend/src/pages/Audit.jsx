import { useEffect, useState } from 'react'
import { api } from '../api/client.js'

export default function Audit() {
  const [events, setEvents] = useState([])
  const [verify, setVerify] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    const { data } = await api.get('/audit/events/')
    setEvents(data)
  }
  useEffect(() => { load() }, [])

  async function runVerify() {
    setErr('')
    try {
      const { data } = await api.get('/audit/verify/')
      setVerify(data)
    } catch (e) {
      setErr(e.response?.status === 403 ? 'Admin only.' : e.message)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row">
          <h1>Audit log</h1>
          <span className="spacer" />
          <button onClick={runVerify}>Verify chain integrity</button>
        </div>
        {err && <p className="danger">{err}</p>}
        {verify && (
          <p className={verify.valid ? 'ok' : 'danger'}>
            {verify.valid
              ? `✓ Chain intact — ${verify.checked} entries verified.`
              : `✗ Tampering detected at sequence #${verify.broken_at_sequence}.`}
          </p>
        )}
        <table>
          <thead><tr><th>#</th><th>Action</th><th>Actor</th><th>When</th><th>Digest</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.sequence}>
                <td>{e.sequence}</td>
                <td><span className="badge">{e.action}</span></td>
                <td>{e.actor_username || '—'}</td>
                <td className="muted">{new Date(e.timestamp).toLocaleString()}</td>
                <td><code>{e.digest.slice(0, 12)}…</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
