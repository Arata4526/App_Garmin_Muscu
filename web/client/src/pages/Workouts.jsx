import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

export default function Workouts () {
  const [workouts, setWorkouts] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    api('/api/workouts').then(setWorkouts).catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const remove = async (w) => {
    if (!confirm(`Supprimer la séance « ${w.name} » ?`)) return
    await api(`/api/workouts/${w.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <section>
      <h1>Mes séances</h1>
      <p><Link className="btn" to="/workouts/new">+ Nouvelle séance</Link></p>
      {error && <div className="banner error">{error}</div>}
      {workouts === null ? <p>Chargement…</p> : workouts.length === 0 ? (
        <p className="muted">Aucune séance pour l'instant.</p>
      ) : (
        <ul className="workout-list">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link to={`/workouts/${w.id}`} className="name">{w.name}</Link>
              <span className="actions">
                <Link to={`/workouts/${w.id}`}>✏️</Link>
                <button className="link" onClick={() => remove(w)}>🗑️</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
