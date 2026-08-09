import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import ExercisePicker from '../components/ExercisePicker.jsx'
import Icon from '../components/Icon.jsx'
import Stepper from '../components/Stepper.jsx'

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

  const patchExercise = (exIdx, fn) => {
    setExercises((list) => list.map((ex, i) => i !== exIdx ? ex : fn(ex)))
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
    if (exercises.length === 0) { setError('Ajoute au moins un exercice.'); return }
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
        <span>Nom de la séance</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Push A" />
      </label>

      <h2>Exercices <small className="muted">({exercises.length})</small></h2>
      <ExercisePicker onPick={addExercise} placeholder="Ajouter un exercice…" />

      {exercises.map((ex, exIdx) => (
        <div className="editor-exercise" key={`${ex.exercise_id}-${exIdx}`}>
          <div className="editor-exercise-head">
            <span className="order">{exIdx + 1}</span>
            <strong>{ex.name}</strong>
            <span className="actions">
              <button className="link" onClick={() => move(exIdx, -1)} title="Monter" aria-label="Monter"><Icon name="chevronUp" /></button>
              <button className="link" onClick={() => move(exIdx, 1)} title="Descendre" aria-label="Descendre"><Icon name="chevronDown" /></button>
              <button className="link" onClick={() => setExercises((l) => l.filter((_, i) => i !== exIdx))} title="Retirer" aria-label="Retirer"><Icon name="trash" /></button>
            </span>
          </div>

          <div className="sets-head">
            <span>Série</span><span>Reps</span><span>Charge (kg)</span><span>Repos (s)</span><span />
          </div>
          {ex.sets.map((s, setIdx) => (
            <div className="set-row" key={setIdx}>
              <span className="set-num">{setIdx + 1}</span>
              <Stepper label="Reps" value={s.reps} step={1} onChange={(v) => updateSet(exIdx, setIdx, 'reps', v)} />
              <Stepper label="Charge" value={s.weight} step={2.5} onChange={(v) => updateSet(exIdx, setIdx, 'weight', v)} />
              <Stepper label="Repos" value={s.rest} step={15} onChange={(v) => updateSet(exIdx, setIdx, 'rest', v)} />
              <button className="link" onClick={() => patchExercise(exIdx, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== setIdx) }))} title="Supprimer la série" aria-label="Supprimer la série">
                <Icon name="x" />
              </button>
            </div>
          ))}

          <div className="set-actions">
            <button className="link" onClick={() => patchExercise(exIdx, (x) => ({ ...x, sets: [...x.sets, newSet()] }))}>
              <Icon name="plus" size={15} /> Série
            </button>
            {ex.sets.length > 0 && (
              <button className="link" onClick={() => patchExercise(exIdx, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))}>
                <Icon name="copy" size={15} /> Dupliquer la dernière
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="editor-actions">
        <button className="btn primary" onClick={save} disabled={saving}>
          <Icon name="save" size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button className="btn" onClick={() => navigate('/workouts')}>Annuler</button>
      </div>
    </section>
  )
}
