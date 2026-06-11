import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

function fmt(secs) {
  const s = Math.max(0, secs)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function TakeExam() {
  const { id } = useParams()
  const nav = useNavigate()
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    (async () => {
      try {
        const a = await api.get(`/api/attempts/${id}`)
        if (a.status !== 'IN_PROGRESS') { nav(`/result/${id}`); return }
        setAttempt(a)
        const init = {}
        a.questions.forEach((q) => { init[q.questionId] = q.savedResponse || '' })
        setAnswers(init)
        setRemaining(a.secondsRemaining)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [id, nav])

  const submit = useCallback(async (auto) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    try {
      await api.post(`/api/attempts/${id}/submit`)
    } catch (e) {
      // even on a late/expired submit the backend finalises the attempt
    } finally {
      nav(`/result/${id}`)
    }
  }, [id, nav])

  // Countdown — auto-submit when it reaches zero.
  useEffect(() => {
    if (!attempt) return
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t)
          submit(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [attempt, submit])

  async function saveAnswer(questionId, response) {
    setAnswers((prev) => ({ ...prev, [questionId]: response }))
    try {
      await api.post(`/api/attempts/${id}/answer`, { questionId, response })
    } catch (e) {
      // ignore transient saves; final state is captured on submit
    }
  }

  if (error) return <div className="error">{error}</div>
  if (!attempt) return <p className="muted">Loading exam…</p>

  const timerClass = remaining <= 30 ? 'danger' : remaining <= 60 ? 'warn' : ''

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>{attempt.examTitle}</h1>
        <div className="right">
          <div className={`timer ${timerClass}`}>⏱ {fmt(remaining)}</div>
        </div>
      </div>
      <p className="muted">Answers save automatically. The exam submits itself when the timer expires.</p>

      {attempt.questions.map((q, idx) => (
        <div className="card" key={q.questionId}>
          <div className="row">
            <span className="pill">{q.type}</span>
            <span className="pill">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
            <span className="right muted">Q{idx + 1}</span>
          </div>
          <div className="q-text">{q.text}</div>
          <QuestionInput q={q} value={answers[q.questionId]} onChange={(v) => saveAnswer(q.questionId, v)} />
        </div>
      ))}

      <div className="row">
        <button className="green" disabled={submitting} onClick={() => submit(false)}>
          {submitting ? 'Submitting…' : 'Submit exam'}
        </button>
        <span className="muted">{attempt.questions.length} questions</span>
      </div>
    </div>
  )
}

function QuestionInput({ q, value, onChange }) {
  if (q.type === 'MCQ') {
    return (
      <div>
        {q.options.map((opt) => (
          <label className="opt" key={opt}>
            <input type="radio" name={`q${q.questionId}`} checked={value === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    )
  }
  if (q.type === 'TRUE_FALSE') {
    return (
      <div>
        {['true', 'false'].map((opt) => (
          <label className="opt" key={opt}>
            <input type="radio" name={`q${q.questionId}`} checked={value === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    )
  }
  if (q.type === 'WRITTEN') {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Write your answer…" />
  }
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer" />
}
