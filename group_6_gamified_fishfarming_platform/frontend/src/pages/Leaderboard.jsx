import { useEffect, useState } from 'react'
import { api, authApi } from '../api.js'

export default function Leaderboard() {
  const [board, setBoard] = useState([])
  const me = authApi.currentUser()
  useEffect(() => { api.get('/leaderboard').then(({ data }) => setBoard(data.leaderboard)) }, [])

  return (
    <div className="container">
      <div className="card">
        <h1>🏆 Cohort leaderboard</h1>
        <table>
          <thead><tr><th>Rank</th><th>Farmer</th><th>XP</th></tr></thead>
          <tbody>
            {board.map((r) => (
              <tr key={r.id} style={r.id === me?.id ? { background: '#0e7490' } : undefined}>
                <td>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</td>
                <td>{r.name}{r.id === me?.id ? ' (you)' : ''}</td>
                <td>{r.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
