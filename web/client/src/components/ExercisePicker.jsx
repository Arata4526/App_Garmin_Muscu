import { useMemo, useState } from 'react'
import { useCatalog } from '../App.jsx'

/** Champ de recherche d'exercice ; onPick(exercise) au clic sur un résultat. */
export default function ExercisePicker ({ onPick, placeholder = 'Rechercher un exercice…' }) {
  const { catalog } = useCatalog()
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return catalog
      .filter((ex) =>
        ex.name.toLowerCase().includes(needle) ||
        ex.target?.toLowerCase().includes(needle) ||
        ex.body_part?.toLowerCase().includes(needle)
      )
      .slice(0, 12)
  }, [q, catalog])

  return (
    <div className="exercise-picker">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
      />
      {results.length > 0 && (
        <ul className="picker-results">
          {results.map((ex) => (
            <li key={ex.id}>
              <button type="button" onClick={() => { onPick(ex); setQ('') }}>
                <img src={`/static/${ex.image_path}`} alt="" loading="lazy" />
                <span>{ex.name}</span>
                <small>{ex.target}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
