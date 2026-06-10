import { useEffect, useState } from 'react'
import { api, authApi } from '../api.js'

// Browse curriculum, open a lesson, mark complete, and take its quiz.
export default function Modules() {
  const [modules, setModules] = useState([])
  const [lesson, setLesson] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState('')
  const isLearner = authApi.currentUser()?.role === 'learner'

  useEffect(() => { api.get('/modules').then(({ data }) => setModules(data.modules)) }, [])

  async function openLesson(id) {
    setResult(null); setAnswers({})
    const { data } = await api.get(`/lessons/${id}`)
    setLesson(data.lesson)
  }

  async function complete() {
    const { data } = await api.post(`/lessons/${lesson.id}/complete`)
    setToast(`+${data.reward.awarded} XP${data.reward.newBadges.length ? ' · 🏅 ' + data.reward.newBadges.map((b) => b.name).join(', ') : ''}`)
  }

  async function submitQuiz(quizId) {
    const { data } = await api.post(`/quizzes/${quizId}/submit`, { answers })
    setResult(data)
    if (data.passed) setToast(`Quiz passed (${data.score}%) · +${data.reward.awarded} XP`)
  }

  return (
    <div className="container">
      {toast && <div className="card ok">✓ {toast}</div>}
      {!lesson && (
        <>
          <h1>Training modules</h1>
          {modules.map((m) => (
            <div className="card" key={m.id}>
              <div className="row"><h2>{m.title}</h2><span className="spacer" /><span className="badge">{m.competency}</span></div>
              {m.Lessons?.map((l) => (
                <div className="row" key={l.id} style={{ justifyContent: 'space-between' }}>
                  <span>📘 {l.title}</span>
                  <button onClick={() => openLesson(l.id)}>Open</button>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {lesson && (
        <div className="card">
          <button className="secondary" onClick={() => setLesson(null)}>← Back</button>
          <h1>{lesson.title}</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{lesson.content}</pre>
          {lesson.videoUrl && <p><a href={lesson.videoUrl}>▶ Demonstration video</a></p>}
          {isLearner && <button onClick={complete}>Mark lesson complete</button>}

          {lesson.Quiz && (
            <div style={{ marginTop: '1rem' }}>
              <h2>Quiz: {lesson.Quiz.title}</h2>
              {lesson.Quiz.Questions.map((q) => (
                <div className="card" key={q.id}>
                  <strong>{q.text}</strong>
                  {q.options.map((opt, idx) => (
                    <label key={idx} className="row" style={{ cursor: 'pointer' }}>
                      <input type="radio" style={{ width: 'auto' }} name={`q${q.id}`}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers({ ...answers, [q.id]: idx })} />
                      <span>{opt}</span>
                    </label>
                  ))}
                  {result && (
                    <span className={result.breakdown.find((b) => b.questionId === q.id)?.correct ? 'ok' : 'danger'}>
                      {result.breakdown.find((b) => b.questionId === q.id)?.correct ? '✓ correct' : '✗ wrong'}
                    </span>
                  )}
                </div>
              ))}
              {isLearner && <button onClick={() => submitQuiz(lesson.Quiz.id)}>Submit quiz</button>}
              {result && <p className={result.passed ? 'ok' : 'danger'}>Score: {result.score}% — {result.passed ? 'Passed' : `Need ${result.passingScore}%`}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
