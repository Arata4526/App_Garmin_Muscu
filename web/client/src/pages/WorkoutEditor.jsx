import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import ExercisePicker from '../components/ExercisePicker.jsx'

const newSet = () => ({ reps: 10, weight: 0, rest: 90 })

export default function WorkoutEditor () {
  const { id } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    api(`/api/workouts/${id}`).then((w) => {
      setName(w.name)
      setExercises(w.exercises.map((ex) => ({ ...ex })))
    }).catch((e) => setError(e.message))
  }, [id])

  const addExercise = (ex) => {
    setExercises((list) => [
      ...list,
      { exercise_id: ex.id, name: ex.name, sets: [newSet(), newSet(), newSet()] }
    ])
  }

  const updateSet = (exIdx, setIdx, field, value) => {
    setExercises((list) => list.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value })
    }))
  }

  const move = (exIdx, dir) => {
    setExercises((list) => {
      const next = [...list]
      const j = exIdx + dir
      if (j < 0 || j >= next.length) return list
      ;[next[exIdx], next[j]] = [next[j], next[exIdx]]
      return next
    })
  }

  const save = async () => {
    setError(null)
    if (!name.trim()) { setError('Donne un nom à la séance.'); return }
    const payload = {
      name: name.trim(),
      exercises: exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets.map((s) => ({
          reps: s.reps === '' ? null : Number(s.reps),
          weight: s.weight === '' ? null : Number(s.weight),
          rest: s.rest === '' ? null : Number(s.rest)
        }))
      }))
    }
    setSaving(true)
    try {
      if (id) await api(`/api/workouts/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await api('/api/workouts', { method: 'POST', body: JSON.stringify(payload) })
      navigate('/workouts')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h1>{id ? 'Modifier la séance' : 'Nouvelle séance'}</h1>
      {error && <div className="banner error">{error}</div>}

      <label className="field">
        Nom de la séance
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Push A" />
      </label>

      <h2>Exercices</h2>
      <ExercisePicker onPick={addExercise} placeholder="Ajouter un exercice…" />

      {exercises.map((ex, exIdx) => (
        <div className="editor-exercise" key={`${ex.exercise_id}-${exIdx}`}>
          <div className="editor-exercise-head">
            <strong>{exIdx + 1}. {ex.name}</strong>
            <span className="actions">
              <button className="link" onClick={() => move(exIdx, -1)} title="Monter">↑</button>
              <button className="link" onClick={() => move(exIdx, 1)} title="Descendre">↓</button>
              <button className="link" onClick={() => setExercises((l) => l.filter((_, i) => i !== exIdx))} title="Retirer">🗑️</button>
            </span>
          </div>
          <table className="sets-table">
            <thead>
              <tr><th>Série</th><th>Reps</th><th>Charge (kg)</th><th>Repos (s)</th><th /></tr>
            </thead>
            <tbody>
              {ex.sets.map((s, setIdx) => (
                <tr key={setIdx}>
                  <td>{setIdx + 1}</td>
                  <td><input type="number" min="0" value={s.reps ?? ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} /></td>
                  <td><input type="number" min="0" step="0.5" value={s.weight ?? ''} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} /></td>
                  <td><input type="number" min="0" step="5" value={s.rest ?? ''} onChange={(e) => updateSet(exIdx, setIdx, 'rest', e.target.value)} /></td>
                  <td>
                    <button className="link" onClick={() => setExercises((l) => l.map((x, i) => i !== exIdx ? x : { ...x, sets: x.sets.filter((_, j) => j !== setIdx) }))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="link" onClick={() => setExercises((l) => l.map((x, i) => i !== exIdx ? x : { ...x, sets: [...x.sets, newSet()] }))}>+ série</button>
        </div>
      ))}

      <div className="editor-actions">
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : '💾 Enregistrer'}
        </button>
        <button className="btn" onClick={() => navigate('/workouts')}>Annuler</button>
      </div>
    </section>
  )
}
