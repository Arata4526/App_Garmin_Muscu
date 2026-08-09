/** Champ numérique avec gros boutons −/+ (mobile-friendly). */
export default function Stepper ({ value, onChange, step = 1, min = 0, label }) {
  const round = (v) => Math.round(v * 100) / 100
  const bump = (dir) => {
    const base = Number(value)
    const next = round((Number.isFinite(base) ? base : 0) + dir * step)
    onChange(Math.max(min, next))
  }
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" className="step-btn" onClick={() => bump(-1)} tabIndex={-1} aria-label={`${label} moins`}>−</button>
      <input
        type="number" inputMode="decimal" min={min} step={step}
        value={value ?? ''} aria-label={label}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
      <button type="button" className="step-btn" onClick={() => bump(1)} tabIndex={-1} aria-label={`${label} plus`}>+</button>
    </div>
  )
}
