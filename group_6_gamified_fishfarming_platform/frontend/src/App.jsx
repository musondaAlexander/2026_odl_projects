import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi } from './api.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Modules from './pages/Modules.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Trainer from './pages/Trainer.jsx'
import Admin from './pages/Admin.jsx'

function Guard({ children, roles }) {
  const user = authApi.currentUser()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function Nav() {
  const navigate = useNavigate()
  const user = authApi.currentUser()
  if (!user) return null
  return (
    <nav className="nav">
      <strong>🐟 FishFarm Learning</strong>
      {user.role === 'learner' && <><NavLink to="/">Dashboard</NavLink><NavLink to="/modules">Learn</NavLink><NavLink to="/leaderboard">Leaderboard</NavLink></>}
      {(user.role === 'trainer' || user.role === 'admin') && <><NavLink to="/trainer">Trainer</NavLink><NavLink to="/modules">Content</NavLink></>}
      {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      <span className="spacer" />
      <span className="muted" style={{ color: '#ecfeff' }}>{user.name} · {user.role}</span>
      <button className="secondary" onClick={() => { authApi.logout(); navigate('/login') }}>Logout</button>
    </nav>
  )
}

export default function App() {
  const user = authApi.currentUser()
  const home = !user ? '/login' : user.role === 'learner' ? '/dashboard' : user.role === 'trainer' ? '/trainer' : '/admin'
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Guard roles={['learner']}><Dashboard /></Guard>} />
        <Route path="/modules" element={<Guard><Modules /></Guard>} />
        <Route path="/leaderboard" element={<Guard><Leaderboard /></Guard>} />
        <Route path="/trainer" element={<Guard roles={['trainer', 'admin']}><Trainer /></Guard>} />
        <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        <Route path="/" element={<Navigate to={user?.role === 'learner' ? '/dashboard' : home} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
