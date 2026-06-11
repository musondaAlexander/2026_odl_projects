import { useEffect, useState } from 'react'
import { api } from '../api.js'

const TYPES = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'WRITTEN']
const EMPTY = { type: 'MCQ', text: '', options: '', correctAnswer: '', marks: 1, topic: '' }

export default function LecturerQuestions() {
  const [questions, setQuestions] = useState([])
  const [corpus, setCorpus] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [doc, setDoc] = useState({ title: '', content: '' })
  const [error, setError] = useState('')

  async function load() {
    try {
      setQuestions(await api.get('/api/questions'))
      setCorpus(await api.get('/api/corpus'))
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  async function addQuestion(e) {
    e.preventDefault()
    setError('')
    const payload = {
      type: form.type,
      text: form.text,
      marks: Number(form.marks) || 1,
      topic: form.topic,
      correctAnswer: form.type === 'WRITTEN' ? null : form.correctAnswer,
      options: form.type === 'MCQ' ? form.options.split(',').map((s) => s.trim()).filter(Boolean) : [],
    }
    try {
      await api.post('/api/questions', payload)
      setForm(EMPTY)
      load()
    } catch (e) { setError(e.message) }
  }

  async function del(id) {
    try { await api.del(`/api/questions/${id}`); load() } catch (e) { setError(e.message) }
  }

  async function addDoc(e) {
    e.preventDefault()
    try { await api.post('/api/corpus', doc); setDoc({ title: '', content: '' }); load() }
    catch (e) { setError(e.message) }
  }

  async function delDoc(id) {
    try { await api.del(`/api/corpus/${id}`); load() } catch (e) { setError(e.message) }
  }

  return (
    <div>
      <h1>Question Bank</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add question</h2>
        <form onSubmit={addQuestion}>
          <div className="row">
            <div style={{ flex: '0 0 180px' }}>
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 100px' }}>
              <label>Marks</label>
              <input type="number" min="1" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Topic</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
          </div>
          <label>Question text</label>
          <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
          {form.type === 'MCQ' && (
            <>
              <label>Options (comma-separated)</label>
              <input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}
                placeholder="Stack, Queue, Tree, Graph" />
            </>
          )}
          {form.type !== 'WRITTEN' && (
            <>
              <label>Correct answer {form.type === 'TRUE_FALSE' && '(true / false)'}</label>
              <input value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} required />
            </>
          )}
          {form.type === 'WRITTEN' && <p className="muted" style={{ fontSize: 12 }}>Written answers are screened for plagiarism, not auto-graded.</p>}
          <div style={{ marginTop: 12 }}><button type="submit">Add to bank</button></div>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Type</th><th>Question</th><th>Answer</th><th>Marks</th><th>Topic</th><th></th></tr></thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id}>
                <td><span className="pill">{q.type}</span></td>
                <td>{q.text}</td>
                <td className="muted">{q.type === 'WRITTEN' ? '—' : q.correctAnswer}</td>
                <td>{q.marks}</td>
                <td className="muted">{q.topic}</td>
                <td><button className="danger sm" onClick={() => del(q.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Reference Corpus <span className="muted" style={{ fontSize: 13 }}>(for plagiarism comparison)</span></h2>
      <div className="card">
        <form onSubmit={addDoc}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Title</label>
              <input value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} required />
            </div>
          </div>
          <label>Content</label>
          <textarea value={doc.content} onChange={(e) => setDoc({ ...doc, content: e.target.value })} required />
          <div style={{ marginTop: 10 }}><button type="submit">Add document</button></div>
        </form>
        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Title</th><th>Length</th><th></th></tr></thead>
          <tbody>
            {corpus.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td className="muted">{d.length} chars</td>
                <td><button className="danger sm" onClick={() => delDoc(d.id)}>Delete</button></td>
              </tr>
            ))}
            {corpus.length === 0 && <tr><td colSpan="3" className="muted">No reference documents yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
