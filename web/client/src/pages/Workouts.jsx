import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'

export default function Workouts () {
  const [workouts, setWorkouts] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    api('/api/workouts')
      .then(async (list) => {
        const details = await Promise.all(
          list.map((w) => api(`/api/workouts/${w.id}`).catch(() => null))
        )
        setWorkouts(list.map((w, i) => ({ ...w, detail: details[i] })))
      })
      .catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const remove = async (w) => {
    if (!confirm(`Supprimer la séance « ${w.name} » ?`)) return
    await api(`/api/workouts/${w.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <section>
      <h1>Séances</h1>
      <p><Link className="btn primary" to="/workouts/new"><Icon name="plus" size={16} /> Nouvelle séance</Link></p>
      {error && <div className="banner error">{error}</div>}
      {workouts === null ? <p className="muted">Chargement…</p> : workouts.length === 0 ? (
        <p className="muted">Aucune séance pour l'instant — crée ta première séance pour la retrouver sur ta montre.</p>
      ) : (
        <ul className="workout-list">
          {workouts.map((w) => {
            const exos = w.detail?.exercises ?? []
            const totalSets = exos.reduce((acc, ex) => acc + ex.sets.length, 0)
            return (
              <li key={w.id} className="workout-card">
                <div className="info">
                  <Link to={`/workouts/${w.id}`} className="name">{w.name}</Link>
                  <div className="meta">
                    {w.detail
                      ? `${exos.length} exercice${exos.length > 1 ? 's' : ''} · ${totalSets} séries`
                      : '…'}
                  </div>
                </div>
                <span className="actions">
                  <Link to={`/workouts/${w.id}`} className="icon-btn" title="Modifier" aria-label="Modifier">
                    <Icon name="chevronDown" size={16} />
                  </Link>
                  <button className="icon-btn" onClick={() => remove(w)} title="Supprimer" aria-label="Supprimer">
                    <Icon name="trash" size={16} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
