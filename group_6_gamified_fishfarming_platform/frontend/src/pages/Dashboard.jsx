import { useEffect, useState } from 'react'
import { api } from '../api.js'

// Learner dashboard: XP, rank, completion, badges, quiz history (proposal §3.4).
export default function Dashboard() {
  const [p, setP] = useState(null)

  useEffect(() => { api.get('/me/progress').then(({ data }) => setP(data)) }, [])
  if (!p) return <div className="container"><p className="muted">Loading…</p></div>

  return (
    <div className="container">
      <div className="grid">
        <div className="card"><div className="muted">Total XP</div><div className="xp">{p.xp}</div></div>
        <div className="card"><div className="muted">Leaderboard rank</div><div className="xp">#{p.rank ?? '—'}</div></div>
        <div className="card">
          <div className="muted">Course completion</div>
          <div className="xp">{p.completion}%</div>
          <div className="bar"><div style={{ width: `${p.completion}%` }} /></div>
          <div className="muted">{p.completedLessons}/{p.totalLessons} lessons</div>
        </div>
      </div>

      <div className="card">
        <h2>Badges earned</h2>
        {p.badges.length === 0 && <p className="muted">No badges yet — complete lessons and quizzes to earn them.</p>}
        {p.badges.map((b) => <span key={b.code} className="badge gold">🏅 {b.name}</span>)}
      </div>

      <div className="card">
        <h2>Recent quiz scores</h2>
        <table>
          <thead><tr><th>Quiz</th><th>Score</th><th>Result</th><th>When</th></tr></thead>
          <tbody>
            {p.quizHistory.map((q, i) => (
              <tr key={i}>
                <td>#{q.quizId}</td><td>{q.score}%</td>
                <td className={q.passed ? 'ok' : 'danger'}>{q.passed ? 'Passed' : 'Failed'}</td>
                <td className="muted">{new Date(q.at).toLocaleDateString()}</td>
              </tr>
            ))}
            {p.quizHistory.length === 0 && <tr><td colSpan="4" className="muted">No attempts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
