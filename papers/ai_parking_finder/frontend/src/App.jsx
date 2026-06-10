import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const WS = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

function user() { const r = localStorage.getItem('pk.user'); return r ? JSON.parse(r) : null }

export default function App() {
  const navigate = useNavigate()
  const u = user()
  return (
    <>
      <nav className="nav">
        <strong>🅿️ AI Parking Finder</strong>
        <NavLink to="/">Map</NavLink>
        {u && <NavLink to="/operator">Operator</NavLink>}
        <span className="spacer" />
        {u ? <button className="secondary" onClick={() => { localStorage.clear(); navigate('/') }}>Logout</button>
          : <NavLink to="/login">Operator login</NavLink>}
      </nav>
      <Routes>
        <Route path="/" element={<DriverMap />} />
        <Route path="/login" element={<Login />} />
        <Route path="/operator" element={user() ? <Operator /> : <Navigate to="/login" />} />
      </Routes>
    </>
  )
}

function useLiveBays() {
  const [data, setData] = useState({ bays: [], available: 0, total: 0, mode: '' })
  useEffect(() => {
    const load = () => axios.get(`${API}/api/public/bays`).then((r) => setData(r.data)).catch(() => {})
    load()
    const ws = new WebSocket(WS)
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === 'bays') setData((d) => ({ ...d, ...m })) }
    const ping = setInterval(() => ws.readyState === 1 && ws.send('ping'), 15000)
    return () => { clearInterval(ping); ws.close() }
  }, [])
  return data
}

function DriverMap() {
  const data = useLiveBays()
  const center = data.bays[0] ? [data.bays[0].lat, data.bays[0].lng] : [-15.4167, 28.2833]
  return (
    <>
      <div className="banner">
        <div><div className="muted">Available bays</div><div className="big">{data.available}<span style={{ fontSize: '1rem', color: 'var(--muted)' }}>/{data.total}</span></div></div>
        <div><div className="muted">Detection mode</div><div style={{ fontWeight: 700, paddingTop: 8 }}>{data.mode}</div></div>
      </div>
      <MapContainer center={center} zoom={19} style={{ height: 'calc(100vh - 130px)' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        {data.bays.map((b) => (
          <CircleMarker key={b.bay_id} center={[b.lat, b.lng]} radius={11}
            pathOptions={{ color: b.status === 'available' ? '#34d399' : '#94a3b8', fillColor: b.status === 'available' ? '#34d399' : '#475569', fillOpacity: 0.85 }}>
            <Tooltip>{b.bay_id}: {b.status}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </>
  )
}

function Login() {
  const [email, setEmail] = useState('operator@parking.zm'); const [password, setPassword] = useState('password123'); const [err, setErr] = useState('')
  const navigate = useNavigate()
  async function submit(e) {
    e.preventDefault(); setErr('')
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, new URLSearchParams({ username: email, password }))
      localStorage.setItem('pk.token', data.access_token); localStorage.setItem('pk.user', JSON.stringify(data.user)); navigate('/operator')
    } catch { setErr('Invalid credentials') }
  }
  return (
    <div className="center"><form className="card" style={{ width: 360 }} onSubmit={submit}>
      <h1>Operator login</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="danger">{err}</p>}
      <button type="submit">Sign in</button>
      <p className="muted">Demo: admin@parking.zm / operator@parking.zm — password123</p>
    </form></div>
  )
}

function Operator() {
  const auth = { headers: { Authorization: `Bearer ${localStorage.getItem('pk.token')}` } }
  const [dash, setDash] = useState(null)
  const [bays, setBays] = useState([])
  async function load() {
    const [{ data: d }, { data: p }] = await Promise.all([axios.get(`${API}/api/dashboard`, auth), axios.get(`${API}/api/public/bays`)])
    setDash(d); setBays(p.bays)
  }
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t) }, [])
  async function override(id, status) { await axios.post(`${API}/api/bays/${id}/override`, { status }, auth); load() }
  if (!dash) return <div className="container"><p className="muted">Loading…</p></div>
  return (
    <div className="container">
      <div className="row">
        <div className="card"><div className="muted">Available</div><div className="big">{dash.available}</div></div>
        <div className="card"><div className="muted">Occupied</div><div className="big" style={{ color: 'var(--muted)' }}>{dash.occupied}</div></div>
        <div className="card"><div className="muted">Mode</div><div className="big" style={{ fontSize: '1.2rem' }}>{dash.mode}</div></div>
      </div>
      <div className="card">
        <h2>Bays — manual override</h2>
        <table><thead><tr><th>Bay</th><th>Status</th><th>Override</th><th></th></tr></thead><tbody>
          {bays.map((b) => (
            <tr key={b.bay_id}><td>{b.bay_id}</td>
              <td><span className={`pill ${b.status}`}>{b.status}</span></td>
              <td>{b.override || '—'}</td>
              <td className="row">
                <button className="secondary" onClick={() => override(b.bay_id, 'available')}>Free</button>
                <button className="secondary" onClick={() => override(b.bay_id, 'occupied')}>Occupy</button>
                <button className="secondary" onClick={() => override(b.bay_id, null)}>Auto</button>
              </td></tr>
          ))}
        </tbody></table>
      </div>
      <div className="card">
        <h2>Recent occupancy events</h2>
        {dash.recentEvents.map((e, i) => <div key={i} className="muted">{new Date(e.ts).toLocaleTimeString()} — {e.bay_id} → {e.status} ({e.source})</div>)}
      </div>
    </div>
  )
}
