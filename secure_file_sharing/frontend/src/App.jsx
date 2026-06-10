import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { auth } from './api/client.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import KeySetup from './pages/KeySetup.jsx'
import Inbox from './pages/Inbox.jsx'
import Send from './pages/Send.jsx'
import Audit from './pages/Audit.jsx'

function RequireAuth({ children }) {
  return auth.isAuthenticated() ? children : <Navigate to="/login" replace />
}

function Nav() {
  const navigate = useNavigate()
  if (!auth.isAuthenticated()) return null
  return (
    <nav className="nav">
      <strong>🔐 SecureShare</strong>
      <NavLink to="/inbox">Inbox</NavLink>
      <NavLink to="/send">Send</NavLink>
      <NavLink to="/keys">My Key</NavLink>
      <NavLink to="/audit">Audit</NavLink>
      <span className="spacer" />
      <button className="secondary" onClick={() => { auth.logout(); navigate('/login') }}>
        Logout
      </button>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/inbox" element={<RequireAuth><Inbox /></RequireAuth>} />
        <Route path="/send" element={<RequireAuth><Send /></RequireAuth>} />
        <Route path="/keys" element={<RequireAuth><KeySetup /></RequireAuth>} />
        <Route path="/audit" element={<RequireAuth><Audit /></RequireAuth>} />
        <Route path="*" element={<Navigate to={auth.isAuthenticated() ? '/inbox' : '/login'} replace />} />
      </Routes>
    </>
  )
}
