import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { api } from '../api.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Trainer/admin analytics dashboard: cohort KPIs, score distribution chart,
// individual learner cards, and the field-task verification queue.
export default function Trainer() {
  const [data, setData] = useState(null)
  const [pending, setPending] = useState([])
  const [toast, setToast] = useState('')

  async function load() {
    const [{ data: dash }, { data: pend }] = await Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/field-tasks/submissions/pending'),
    ])
    setData(dash)
    setPending(pend.submissions)
  }
  useEffect(() => { load() }, [])

  async function review(id, status) {
    const { data: res } = await api.post(`/field-tasks/submissions/${id}/review`, { status })
    setToast(status === 'verified' ? `Verified · learner +${res.reward?.awarded ?? 0} XP` : 'Rejected')
    load()
  }

  if (!data) return <div className="container"><p className="muted">Loading…</p></div>

  const dist = data.scoreDistribution
  const chart = {
    labels: Object.keys(dist),
    datasets: [{ label: 'Quiz attempts', data: Object.values(dist), backgroundColor: '#22d3ee' }],
  }

  return (
    <div className="container">
      {toast && <div className="card ok">✓ {toast}</div>}
      <div className="grid">
        <div className="card"><div className="muted">Learners</div><div className="xp">{data.cohort.learners}</div></div>
        <div className="card"><div className="muted">Avg XP</div><div className="xp">{data.cohort.avgXp}</div></div>
        <div className="card"><div className="muted">Avg completion</div><div className="xp">{data.cohort.avgCompletion}%</div></div>
        <div className="card"><div className="muted">At-risk</div><div className="xp danger">{data.cohort.atRiskCount}</div></div>
      </div>

      <div className="card">
        <h2>Quiz score distribution</h2>
        <Bar data={chart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>

      <div className="card">
        <h2>Field-task verification queue</h2>
        {pending.length === 0 && <p className="muted">No submissions awaiting review.</p>}
        <table>
          <tbody>
            {pending.map((s) => (
              <tr key={s.id}>
                <td>{s.User?.name}</td>
                <td>{s.FieldTask?.title}</td>
                <td><a href={s.evidenceUrl} target="_blank" rel="noreferrer">evidence</a></td>
                <td className="row">
                  <button onClick={() => review(s.id, 'verified')}>Verify</button>
                  <button className="secondary" onClick={() => review(s.id, 'rejected')}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Individual learner progress</h2>
        <table>
          <thead><tr><th>Learner</th><th>XP</th><th>Completion</th><th>Quiz avg</th><th>Status</th></tr></thead>
          <tbody>
            {data.learners.map((l) => (
              <tr key={l.id}>
                <td>{l.name}<div className="muted">{l.email}</div></td>
                <td>{l.xp}</td>
                <td>{l.completionRate}%</td>
                <td>{l.quizAverage ?? '—'}</td>
                <td><span className={`pill ${l.atRisk ? 'risk' : 'ok'}`}>{l.atRisk ? 'At risk' : 'On track'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
