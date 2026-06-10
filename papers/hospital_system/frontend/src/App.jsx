import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi } from './api.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Appointments from './pages/Appointments.jsx'
import Patients from './pages/Patients.jsx'
import Admin from './pages/Admin.jsx'

function Guard({ children, roles }) {
  const u = authApi.user()
  if (!u) return <Navigate to="/login" replace />
  if (roles && !roles.includes(u.role)) return <Navigate to="/" replace />
  return children
}

function Nav() {
  const u = authApi.user()
  const navigate = useNavigate()
  if (!u) return null
  return (
    <nav className="nav">
      <strong>🏥 Hospital MS</strong>
      <NavLink to="/">Dashboard</NavLink>
      <NavLink to="/appointments">Appointments</NavLink>
      {['admin', 'doctor', 'nurse'].includes(u.role) && <NavLink to="/patients">Patients</NavLink>}
      {u.role === 'admin' && <NavLink to="/admin">Users</NavLink>}
      <span className="spacer" />
      <span className="muted">{u.name} · {u.role}</span>
      <button className="secondary" onClick={() => { authApi.logout(); navigate('/login') }}>Logout</button>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Dashboard /></Guard>} />
        <Route path="/appointments" element={<Guard><Appointments /></Guard>} />
        <Route path="/patients" element={<Guard roles={['admin', 'doctor', 'nurse']}><Patients /></Guard>} />
        <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
