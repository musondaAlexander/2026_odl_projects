import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function StudentHome() {
  const [exams, setExams] = useState([])
  const [attempts, setAttempts] = useState([])
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function load() {
    try {
      setExams(await api.get('/api/exams/available'))
      setAttempts(await api.get('/api/me/attempts'))
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { load() }, [])

  async function start(examId) {
    setError('')
    try {
      const attempt = await api.post(`/api/exams/${examId}/start`)
      nav(`/attempt/${attempt.attemptId}`)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h1>Available Examinations</h1>
      {error && <div className="error">{error}</div>}
      <div className="grid cols2">
        {exams.map((ex) => (
          <div className="card" key={ex.id}>
            <div className="row">
              <strong>{ex.title}</strong>
              <span className="right pill">{ex.durationMinutes} min</span>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>{ex.description}</p>
            <div className="row" style={{ fontSize: 12 }}>
              <span className="pill">{ex.questionCount} questions</span>
              <span className="pill">plagiarism ≥ {ex.plagiarismThreshold}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => start(ex.id)}>Start exam</button>
            </div>
          </div>
        ))}
        {exams.length === 0 && <p className="muted">No published exams yet.</p>}
      </div>

      <h2>My Attempts</h2>
      <div className="card">
        <table>
          <thead><tr><th>Exam</th><th>Status</th><th>Score</th><th>Started</th><th></th></tr></thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.attemptId}>
                <td>{a.examTitle}</td>
                <td><StatusBadge status={a.status} /></td>
                <td>{a.status === 'IN_PROGRESS' ? '—' : `${a.scorePercent}%`}</td>
                <td className="muted">{new Date(a.startedAt).toLocaleString()}</td>
                <td>
                  {a.status === 'IN_PROGRESS'
                    ? <button className="sm" onClick={() => nav(`/attempt/${a.attemptId}`)}>Resume</button>
                    : <button className="ghost sm" onClick={() => nav(`/result/${a.attemptId}`)}>View result</button>}
                </td>
              </tr>
            ))}
            {attempts.length === 0 && <tr><td colSpan="5" className="muted">No attempts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cls = status === 'IN_PROGRESS' ? 'amber' : status === 'AUTO_SUBMITTED' ? 'red' : 'green'
  return <span className={`badge ${cls}`}>{status}</span>
}
