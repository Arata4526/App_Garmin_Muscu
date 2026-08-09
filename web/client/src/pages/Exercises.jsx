import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useCatalog } from '../App.jsx'
import Icon from '../components/Icon.jsx'

function ExerciseDetail ({ exercise, onClose }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let alive = true
    api(`/api/exercises/${exercise.id}`)
      .then((d) => { if (alive) setDetail(d) })
      .catch(() => { if (alive) setDetail(exercise) })
    return () => { alive = false }
  }, [exercise])

  const d = detail || exercise
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <button className="close" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button>
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
      <span className="thumb">
        {src && <img src={`/static/${src}`} alt={exercise.name} loading="lazy" />}
        {exercise.gif_path && (
          <span className="gif-badge"><Icon name="play" size={10} />GIF</span>
        )}
      </span>
      <span className="name">{exercise.name}</span>
      <span className="tags">
        <span className="tag target">{exercise.target}</span>
        <span className="tag">{exercise.equipment}</span>
      </span>
    </button>
  )
}

export default function Exercises () {
  const { catalog, loading } = useCatalog()
  const [q, setQ] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [opened, setOpened] = useState(null)

  const { bodyParts, muscles, equipments } = useMemo(() => ({
    bodyParts: [...new Set(catalog.map((e) => e.body_part).filter(Boolean))].sort(),
    muscles: [...new Set(catalog.map((e) => e.target).filter(Boolean))].sort(),
    equipments: [...new Set(catalog.map((e) => e.equipment).filter(Boolean))].sort()
  }), [catalog])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return catalog.filter((ex) =>
      (!needle || ex.name.toLowerCase().includes(needle)) &&
      (!bodyPart || ex.body_part === bodyPart) &&
      (!muscle || ex.target === muscle || ex.muscle_group === muscle) &&
      (!equipment || ex.equipment === equipment)
    )
  }, [catalog, q, bodyPart, muscle, equipment])

  if (loading) return <p className="muted">Chargement du catalogue…</p>

  return (
    <section>
      <h1>Exercices <small>{filtered.length} / {catalog.length}</small></h1>

      <div className="filters">
        <div className="filters-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un exercice…" />
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)} aria-label="Muscle cible">
            <option value="">Muscle (tous)</option>
            {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)} aria-label="Matériel">
            <option value="">Matériel (tout)</option>
            {equipments.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
        <div className="chips">
          <button className={`chip ${bodyPart === '' ? 'active' : ''}`} onClick={() => setBodyPart('')}>Tout</button>
          {bodyParts.map((bp) => (
            <button key={bp} className={`chip ${bodyPart === bp ? 'active' : ''}`} onClick={() => setBodyPart(bp === bodyPart ? '' : bp)}>
              {bp}
            </button>
          ))}
        </div>
      </div>

      <div className="exercise-grid">
        {filtered.slice(0, 200).map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} onOpen={setOpened} />
        ))}
      </div>
      {filtered.length > 200 && <p className="muted">… {filtered.length - 200} autres résultats, affine la recherche.</p>}
      {filtered.length === 0 && <p className="muted">Aucun exercice ne correspond à ces filtres.</p>}

      {opened && <ExerciseDetail exercise={opened} onClose={() => setOpened(null)} />}
    </section>
  )
}
