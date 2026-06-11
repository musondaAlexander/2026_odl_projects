import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, downloadPdf } from '../api.js'

export default function Result() {
  const { id } = useParams()
  const nav = useNavigate()
  const [r, setR] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/attempts/${id}/result`).then(setR).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="error">{error}</div>
  if (!r) return <p className="muted">Loading result…</p>

  return (
    <div>
      <div className="row">
        <h1 style={{ margin: 0 }}>{r.examTitle} — Result</h1>
        <button className="right ghost" onClick={() => downloadPdf(`/api/attempts/${id}/report.pdf`, `result-${id}.pdf`)}>
          ⬇ Download PDF report
        </button>
      </div>

      <div className="grid stats" style={{ marginTop: 14 }}>
        <div className="stat"><div className="n">{r.scorePercent}%</div><div className="l">Score (objective)</div></div>
        <div className="stat"><div className="n">{r.awardedMarks}/{r.totalMarks}</div><div className="l">Marks awarded</div></div>
        <div className="stat"><div className="n">{r.status}</div><div className="l">Status</div></div>
        <div className="stat"><div className="n">{r.answers.length}</div><div className="l">Questions</div></div>
      </div>

      <h2>Feedback</h2>
      {r.answers.map((a, i) => (
        <div className="card" key={i}>
          <div className="row">
            <span className="pill">{a.type}</span>
            <span className="pill">{a.awarded}/{a.marks} marks</span>
            {a.correct === true && <span className="badge green">Correct</span>}
            {a.correct === false && <span className="badge red">Incorrect</span>}
            {a.correct === null && <span className="badge gray">Not auto-graded</span>}
            <span className="right muted">Q{i + 1}</span>
          </div>
          <div className="q-text">{a.questionText}</div>
          <div style={{ fontSize: 13 }}>
            <div><span className="muted">Your answer: </span>{a.response || <em className="muted">(blank)</em>}</div>
            {a.type !== 'WRITTEN' && <div><span className="muted">Correct answer: </span>{a.correctAnswer}</div>}
          </div>
          {a.plagiarism && <Plagiarism p={a.plagiarism} />}
        </div>
      ))}

      <button className="ghost" onClick={() => nav(-1)}>← Back</button>
    </div>
  )
}

function Plagiarism({ p }) {
  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
      <div className="row">
        <strong style={{ fontSize: 13 }}>Plagiarism analysis</strong>
        {!p.analyzed && <span className="badge gray">service offline</span>}
        {p.analyzed && p.flagged && <span className="badge red">FLAGGED</span>}
        {p.analyzed && !p.flagged && <span className="badge green">clear</span>}
        <span className="right muted" style={{ fontSize: 12 }}>
          similarity {(p.similarity * 100).toFixed(1)}% / threshold {(p.threshold * 100).toFixed(0)}%
        </span>
      </div>
      {p.flagged && p.evidence && (
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Closest match {p.matchedId ? `(corpus #${p.matchedId})` : ''}: “{p.evidence}”
        </p>
      )}
    </div>
  )
}
