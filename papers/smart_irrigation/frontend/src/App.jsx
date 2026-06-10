import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const WS = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('si.token') || '')
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('si.user') || 'null'))
  if (!token) return <Login onAuth={(t, u) => { setToken(t); setUser(u); localStorage.setItem('si.token', t); localStorage.setItem('si.user', JSON.stringify(u)) }} />
  return <Dashboard token={token} user={user} onLogout={() => { localStorage.clear(); setToken('') }} />
}

function Login({ onAuth }) {
  const [email, setEmail] = useState('farmer@farm.zm'); const [password, setPassword] = useState('password123'); const [err, setErr] = useState('')
  async function submit(e) {
    e.preventDefault(); setErr('')
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, new URLSearchParams({ username: email, password }))
      onAuth(data.access_token, data.user)
    } catch { setErr('Invalid credentials') }
  }
  return (
    <div className="center"><form className="card" style={{ width: 380 }} onSubmit={submit}>
      <h1>💧 Smart Irrigation</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="danger">{err}</p>}
      <button type="submit">Sign in</button>
      <p className="muted">Demo: admin@farm.zm / farmer@farm.zm / viewer@farm.zm — password123</p>
    </form></div>
  )
}

function Dashboard({ token, user, onLogout }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } }
  const [nodes, setNodes] = useState([])
  const [history, setHistory] = useState({})
  const [alerts, setAlerts] = useState([])
  const wsRef = useRef(null)

  async function loadNodes() {
    const { data } = await axios.get(`${API}/api/nodes`, auth); setNodes(data)
    for (const n of data) {
      const h = await axios.get(`${API}/api/nodes/${n.node_id}/history`, auth)
      setHistory((prev) => ({ ...prev, [n.node_id]: h.data }))
    }
    const a = await axios.get(`${API}/api/alerts`, auth); setAlerts(a.data)
  }
  useEffect(() => {
    loadNodes()
    const ws = new WebSocket(WS); wsRef.current = ws
    ws.onmessage = () => loadNodes() // refresh on any live reading
    const ping = setInterval(() => ws.readyState === 1 && ws.send('ping'), 15000)
    return () => { clearInterval(ping); ws.close() }
  }, [])

  const canControl = ['farmer', 'admin'].includes(user?.role)
  async function setThresholds(id, lower, upper) { await axios.put(`${API}/api/nodes/${id}/thresholds`, { lower: Number(lower), upper: Number(upper) }, auth); loadNodes() }
  async function override(id, val) { await axios.post(`${API}/api/nodes/${id}/override`, { override: val }, auth); loadNodes() }

  return (
    <>
      <nav className="nav"><strong>💧 Smart Irrigation</strong><span className="spacer" />
        <span className="muted">{user?.name} · {user?.role}</span>
        <button className="secondary" onClick={onLogout}>Logout</button></nav>
      <div className="container">
        {alerts.length > 0 && <div className="card"><b className="warn">⚠ Alerts</b>{alerts.map((a, i) =>
          <p key={i} className="warn">{a.node_id}: {a.message} (soil {a.soil_moisture}%)</p>)}</div>}
        <div className="grid">
          {nodes.map((n) => (
            <NodeCard key={n.node_id} node={n} history={history[n.node_id] || []}
              canControl={canControl} onThresholds={setThresholds} onOverride={override} />
          ))}
        </div>
      </div>
    </>
  )
}

function NodeCard({ node, history, canControl, onThresholds, onOverride }) {
  const [lower, setLower] = useState(node.lower); const [upper, setUpper] = useState(node.upper)
  const latest = history[history.length - 1]
  const data = {
    labels: history.map((_, i) => i),
    datasets: [{ label: 'Soil moisture %', data: history.map((r) => r.soil_moisture), borderColor: '#34d399', tension: 0.3, pointRadius: 0 }],
  }
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{node.name} <span className="muted">({node.crop})</span></h2>
        <span className={`pump ${node.pump_on ? 'on' : 'off'}`}>Pump {node.pump_on ? 'ON' : 'OFF'}</span>
      </div>
      <div className="gauge">{latest ? latest.soil_moisture : '—'}<span style={{ fontSize: '1rem' }}>% soil</span></div>
      <Line data={data} options={{ plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }} height={120} />
      {canControl && (
        <>
          <div className="row">
            <label className="muted">band</label>
            <input type="number" value={lower} onChange={(e) => setLower(e.target.value)} style={{ width: 70 }} />
            <input type="number" value={upper} onChange={(e) => setUpper(e.target.value)} style={{ width: 70 }} />
            <button onClick={() => onThresholds(node.node_id, lower, upper)}>Save</button>
          </div>
          <div className="row">
            <button className="secondary" onClick={() => onOverride(node.node_id, 'on')}>Force ON</button>
            <button className="secondary" onClick={() => onOverride(node.node_id, 'off')}>Force OFF</button>
            <button className="secondary" onClick={() => onOverride(node.node_id, null)}>Auto</button>
            {node.override && <span className="warn">override: {node.override}</span>}
          </div>
        </>
      )}
    </div>
  )
}
