import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { api } from '../api.js'
import ExercisePicker from '../components/ExercisePicker.jsx'

const CHART = {
  orange: '#ff5a1f',
  blue: '#58a6ff',
  grid: '#2d2922',
  tick: '#a8a095'
}

const tooltipStyle = {
  contentStyle: {
    background: '#201d18',
    border: '1px solid #2d2922',
    borderRadius: 10,
    fontSize: 13
  },
  labelStyle: { color: '#a8a095', marginBottom: 4 },
  itemStyle: { color: '#f5f2ec' }
}

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
    const reps = p.sets.reduce((acc, s) => acc + (Number(s.reps) || 0), 0)
    return {
      date: fmtDate(p.date),
      chargeMax: weights.length ? Math.max(...weights) : 0,
      volume: Math.round(volume),
      reps
    }
  }), [progress])

  const kpis = useMemo(() => {
    if (!chartData.length) return null
    const best = Math.max(...chartData.map((d) => d.chargeMax))
    const last = chartData[chartData.length - 1]
    const progressPct = chartData.length > 1 && chartData[0].chargeMax > 0
      ? Math.round(((last.chargeMax - chartData[0].chargeMax) / chartData[0].chargeMax) * 100)
      : null
    return { sessions: chartData.length, best, lastVolume: last.volume, progressPct }
  }, [chartData])

  return (
    <section>
      <h1>Progression</h1>

      <h2>Courbes par exercice</h2>
      <ExercisePicker onPick={setExercise} placeholder="Choisir un exercice…" />
      {exercise && <h3>{exercise.name}</h3>}

      {exercise && progress.length === 0 && (
        <p className="muted">Aucune session enregistrée pour cet exercice.</p>
      )}

      {kpis && (
        <div className="kpis">
          <div className="kpi">
            <div className="value">{kpis.best}<small> kg</small></div>
            <div className="label">Record charge</div>
          </div>
          <div className="kpi">
            <div className="value">{kpis.lastVolume}<small> kg</small></div>
            <div className="label">Volume dernière séance</div>
          </div>
          <div className="kpi">
            <div className="value">{kpis.sessions}</div>
            <div className="label">Sessions</div>
          </div>
          {kpis.progressPct !== null && (
            <div className="kpi">
              <div className="value" style={{ color: kpis.progressPct >= 0 ? 'var(--accent)' : 'var(--accent-2)' }}>
                {kpis.progressPct >= 0 ? '+' : ''}{kpis.progressPct}<small> %</small>
              </div>
              <div className="label">Depuis le début</div>
            </div>
          )}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="charts">
          <div className="chart">
            <h4>Charge max (kg)</h4>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" stroke={CHART.tick} fontSize={12} tickLine={false} axisLine={{ stroke: CHART.grid }} />
                <YAxis stroke={CHART.tick} fontSize={12} tickLine={false} axisLine={false} width={48} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, 'Charge max']} />
                <Line type="monotone" dataKey="chargeMax" stroke={CHART.orange} strokeWidth={2.5}
                  dot={{ r: 3.5, fill: CHART.orange, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: CHART.orange, stroke: '#0e0d0b', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart">
            <h4>Volume total (reps × kg)</h4>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" stroke={CHART.tick} fontSize={12} tickLine={false} axisLine={{ stroke: CHART.grid }} />
                <YAxis stroke={CHART.tick} fontSize={12} tickLine={false} axisLine={false} width={48} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, 'Volume']} />
                <Line type="monotone" dataKey="volume" stroke={CHART.blue} strokeWidth={2.5}
                  dot={{ r: 3.5, fill: CHART.blue, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: CHART.blue, stroke: '#0e0d0b', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <h2>Historique des sessions</h2>
      {sessions.length === 0 ? (
        <p className="muted">Aucune session pour l'instant — elles arriveront de la montre via <code>POST /api/sessions</code>.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Date</th><th>Séance</th><th>Début</th><th>Fin</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.finished_at || s.started_at || s.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                  <td>{s.workout_name || '—'}</td>
                  <td>{s.started_at ? new Date(s.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{s.finished_at ? new Date(s.finished_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
