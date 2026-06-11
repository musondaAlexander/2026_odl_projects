import { useEffect, useState } from 'react'
import { api, downloadPdf } from '../api.js'

const NEW_EXAM = { title: '', description: '', durationMinutes: 30, questionCount: 5, plagiarismThreshold: 0.6 }

export default function LecturerExams() {
  const [exams, setExams] = useState([])
  const [questions, setQuestions] = useState([])
  const [form, setForm] = useState(NEW_EXAM)
  const [sel, setSel] = useState(null)        // selected exam
  const [pool, setPool] = useState(new Set())
  const [analytics, setAnalytics] = useState(null)
  const [flags, setFlags] = useState([])
  const [error, setError] = useState('')

  async function load() {
    try {
      setExams(await api.get('/api/exams'))
      setQuestions(await api.get('/api/questions'))
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/api/exams', {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        questionCount: Number(form.questionCount),
        plagiarismThreshold: Number(form.plagiarismThreshold),
      })
      setForm(NEW_EXAM)
      load()
    } catch (e) { setError(e.message) }
  }

  async function open(ex) {
    setSel(ex)
    setAnalytics(null)
    setFlags([])
    try {
      const full = await api.get(`/api/exams/${ex.id}`)
      setSel(full)
      setAnalytics(await api.get(`/api/exams/${ex.id}/analytics`))
      setFlags(await api.get(`/api/exams/${ex.id}/plagiarism`))
      // Pre-tick the current pool by fetching it indirectly: we only know size,
      // so start empty and let the lecturer (re)select. Mark known via attempts unaffected.
      setPool(new Set())
    } catch (e) { setError(e.message) }
  }

  function togglePool(id) {
    const next = new Set(pool)
    next.has(id) ? next.delete(id) : next.add(id)
    setPool(next)
  }

  async function savePool() {
    try {
      await api.post(`/api/exams/${sel.id}/questions`, { questionIds: [...pool] })
      await load()
      open({ id: sel.id })
    } catch (e) { setError(e.message) }
  }

  async function publish(ex, published) {
    try { await api.post(`/api/exams/${ex.id}/publish?published=${published}`); load(); if (sel?.id === ex.id) open({ id: ex.id }) }
    catch (e) { setError(e.message) }
  }

  return (
    <div>
      <h1>Examinations</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create exam</h2>
        <form onSubmit={create}>
          <label>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <label>Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="row">
            <div><label>Duration (min)</label>
              <input type="number" min="1" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></div>
            <div><label>Questions delivered</label>
              <input type="number" min="1" value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: e.target.value })} /></div>
            <div><label>Plagiarism threshold</label>
              <input type="number" step="0.05" min="0" max="1" value={form.plagiarismThreshold} onChange={(e) => setForm({ ...form, plagiarismThreshold: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}><button type="submit">Create</button></div>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Title</th><th>Pool</th><th>Delivers</th><th>Attempts</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {exams.map((ex) => (
              <tr key={ex.id}>
                <td>{ex.title}</td>
                <td className="muted">{ex.poolSize}</td>
                <td className="muted">{ex.questionCount}</td>
                <td className="muted">{ex.attempts}</td>
                <td>{ex.published ? <span className="badge green">published</span> : <span className="badge gray">draft</span>}</td>
                <td className="row">
                  <button className="sm" onClick={() => open(ex)}>Manage</button>
                  {ex.published
                    ? <button className="ghost sm" onClick={() => publish(ex, false)}>Unpublish</button>
                    : <button className="green sm" onClick={() => publish(ex, true)}>Publish</button>}
                  <button className="ghost sm" onClick={() => downloadPdf(`/api/exams/${ex.id}/report.pdf`, `exam-${ex.id}.pdf`)}>PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Manage: {sel.title}</h2>

          {analytics && (
            <div className="grid stats" style={{ marginBottom: 12 }}>
              <div className="stat"><div className="n">{analytics.participants}</div><div className="l">Participants</div></div>
              <div className="stat"><div className="n">{analytics.averageScore}%</div><div className="l">Avg score</div></div>
              <div className="stat"><div className="n">{analytics.plagiarismFlagRate}%</div><div className="l">Plagiarism flag rate</div></div>
              <div className="stat"><div className="n">{analytics.flaggedAnswers}/{analytics.writtenAnswers}</div><div className="l">Flagged / written</div></div>
            </div>
          )}

          <h2>Question pool <span className="muted" style={{ fontSize: 12 }}>(tick the questions, then save — replaces the pool)</span></h2>
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            {questions.map((q) => (
              <label className="opt" key={q.id}>
                <input type="checkbox" checked={pool.has(q.id)} onChange={() => togglePool(q.id)} />
                <span className="pill">{q.type}</span> {q.text}
              </label>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={savePool} disabled={pool.size === 0}>Save pool ({pool.size})</button>
            <button className="ghost" onClick={() => setSel(null)}>Close</button>
          </div>

          <h2>Plagiarism flags</h2>
          <table>
            <thead><tr><th>Student</th><th>Q</th><th>Similarity</th><th>Flag</th><th>Evidence</th></tr></thead>
            <tbody>
              {flags.map((f, i) => (
                <tr key={i}>
                  <td>{f.studentName}</td>
                  <td className="muted">#{f.questionId}</td>
                  <td>{(f.similarity * 100).toFixed(1)}%</td>
                  <td>{f.flagged ? <span className="badge red">FLAGGED</span> : <span className="badge green">clear</span>}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{f.evidence}</td>
                </tr>
              ))}
              {flags.length === 0 && <tr><td colSpan="5" className="muted">No written submissions analysed yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
