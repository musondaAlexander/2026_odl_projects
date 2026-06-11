import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Login from './pages/Login.jsx'
import StudentHome from './pages/StudentHome.jsx'
import TakeExam from './pages/TakeExam.jsx'
import Result from './pages/Result.jsx'
import LecturerExams from './pages/LecturerExams.jsx'
import LecturerQuestions from './pages/LecturerQuestions.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

function homeFor(role) {
  if (role === 'ADMIN') return '/admin'
  if (role === 'LECTURER') return '/lecturer'
  return '/exams'
}

function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return children
}

function NavBar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  if (!user) return null
  return (
    <nav className="nav">
      <span className="brand">📝 Online Exam</span>
      {user.role === 'STUDENT' && <Link to="/exams">My Exams</Link>}
      {(user.role === 'LECTURER' || user.role === 'ADMIN') && <Link to="/lecturer">Exams</Link>}
      {(user.role === 'LECTURER' || user.role === 'ADMIN') && <Link to="/lecturer/questions">Question Bank</Link>}
      {user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
      <span className="spacer" />
      <span className="who">{user.fullName} · {user.role}</span>
      <button className="ghost" onClick={() => { logout(); nav('/login') }}>Logout</button>
    </nav>
  )
}

export default function App() {
  const { user } = useAuth()
  return (
    <div className="app">
      <NavBar />
      <main className="main">
        <Routes>
          <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
          <Route path="/exams" element={<RequireRole roles={['STUDENT']}><StudentHome /></RequireRole>} />
          <Route path="/attempt/:id" element={<RequireRole roles={['STUDENT']}><TakeExam /></RequireRole>} />
          <Route path="/result/:id" element={<RequireRole><Result /></RequireRole>} />
          <Route path="/lecturer" element={<RequireRole roles={['LECTURER', 'ADMIN']}><LecturerExams /></RequireRole>} />
          <Route path="/lecturer/questions" element={<RequireRole roles={['LECTURER', 'ADMIN']}><LecturerQuestions /></RequireRole>} />
          <Route path="/admin" element={<RequireRole roles={['ADMIN']}><AdminDashboard /></RequireRole>} />
          <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  )
}
