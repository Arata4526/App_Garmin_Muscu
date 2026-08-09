import { useMemo, useState } from 'react'
import { api } from '../api.js'
import { useCatalog } from '../App.jsx'

function ExerciseDetail ({ exercise, onClose }) {
  const [detail, setDetail] = useState(null)

  useMemo(() => {
    api(`/api/exercises/${exercise.id}`).then(setDetail).catch(() => setDetail(exercise))
  }, [exercise])

  const d = detail || exercise
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h2>{d.name}</h2>
        <div className="modal-body">
          {d.gif_path && <img className="modal-gif" src={`/static/${d.gif_path}`} alt={d.name} />}
          <div>
            <p><strong>Zone :</strong> {d.body_part} · <strong>Cible :</strong> {d.target}</p>
            <p><strong>Groupe :</strong> {d.muscle_group}</p>
            {d.secondary_muscles?.length > 0 && (
              <p><strong>Secondaires :</strong> {d.secondary_muscles.join(', ')}</p>
            )}
            <p><strong>Matériel :</strong> {d.equipment}</p>
            {d.instruction_steps_fr?.length > 0 && (
              <ol>
                {d.instruction_steps_fr.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ExerciseCard ({ exercise, onOpen }) {
  const [hover, setHover] = useState(false)
  const src = hover && exercise.gif_path ? exercise.gif_path : exercise.image_path
  return (
    <button
      className="exercise-card"
      onClick={() => onOpen(exercise)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {src && <img src={`/static/${src}`} alt={exercise.name} loading="lazy" />}
      <span className="name">{exercise.name}</span>
      <span className="tags">
        <em>{exercise.target}</em>
        <em>{exercise.equipment}</em>
      </span>
    </button>
  )
}

export default function Exercises () {
  const { catalog, loading } = useCatalog()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [opened, setOpened] = useState(null)

  const { muscles, equipments } = useMemo(() => ({
    muscles: [...new Set(catalog.map((e) => e.target).filter(Boolean))].sort(),
    equipments: [...new Set(catalog.map((e) => e.equipment).filter(Boolean))].sort()
  }), [catalog])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return catalog.filter((ex) =>
      (!needle || ex.name.toLowerCase().includes(needle)) &&
      (!muscle || ex.target === muscle || ex.muscle_group === muscle) &&
      (!equipment || ex.equipment === equipment)
    )
  }, [catalog, q, muscle, equipment])

  if (loading) return <p>Chargement du catalogue…</p>

  return (
    <section>
      <h1>Bibliothèque d'exercices <small>({filtered.length}/{catalog.length})</small></h1>
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" />
        <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          <option value="">Muscle (tous)</option>
          {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          <option value="">Matériel (tout)</option>
          {equipments.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>
      <div className="exercise-grid">
        {filtered.slice(0, 200).map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} onOpen={setOpened} />
        ))}
      </div>
      {filtered.length > 200 && <p className="muted">… {filtered.length - 200} autres résultats, affine la recherche.</p>}
      {opened && <ExerciseDetail exercise={opened} onClose={() => setOpened(null)} />}
    </section>
  )
}
