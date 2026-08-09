import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { api } from '../api.js'
import ExercisePicker from '../components/ExercisePicker.jsx'

function fmtDate (iso) {
  if (!iso) return '?'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function Progress () {
  const [exercise, setExercise] = useState(null)
  const [progress, setProgress] = useState([])
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    api('/api/sessions').then(setSessions).catch(() => {})
  }, [])

  useEffect(() => {
    if (!exercise) { setProgress([]); return }
    api(`/api/exercises/${exercise.id}/progress`).then(setProgress).catch(() => setProgress([]))
  }, [exercise])

  const chartData = useMemo(() => progress.map((p) => {
    const weights = p.sets.map((s) => Number(s.weight) || 0)
    const volume = p.sets.reduce((acc, s) => acc + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0)
    const tonnage = p.sets.reduce((acc, s) => acc + (Number(s.reps) || 0), 0)
    return {
      date: fmtDate(p.date),
      chargeMax: weights.length ? Math.max(...weights) : 0,
      volume: Math.round(volume),
      reps: tonnage
    }
  }), [progress])

  return (
    <section>
      <h1>Progression</h1>

      <h2>Courbes par exercice</h2>
      <ExercisePicker onPick={setExercise} placeholder="Choisir un exercice…" />
      {exercise && <h3>{exercise.name}</h3>}

      {exercise && progress.length === 0 && (
        <p className="muted">Aucune session enregistrée pour cet exercice.</p>
      )}

      {chartData.length > 0 && (
        <div className="charts">
          <div className="chart">
            <h4>Charge max (kg)</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Line type="monotone" dataKey="chargeMax" stroke="#ff7847" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart">
            <h4>Volume (reps × kg)</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#4dabf7" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <h2>Historique des sessions</h2>
      {sessions.length === 0 ? (
        <p className="muted">Aucune session pour l'instant — elles arriveront de la montre via <code>POST /api/sessions</code>.</p>
      ) : (
        <table className="sessions-table">
          <thead>
            <tr><th>Date</th><th>Séance</th><th>Début</th><th>Fin</th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{fmtDate(s.finished_at || s.started_at || s.created_at)}</td>
                <td>{s.workout_name || '—'}</td>
                <td>{s.started_at ? new Date(s.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td>{s.finished_at ? new Date(s.finished_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
