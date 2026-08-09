import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { api, getToken, setToken } from './api.js'
import Exercises from './pages/Exercises.jsx'
import Workouts from './pages/Workouts.jsx'
import WorkoutEditor from './pages/WorkoutEditor.jsx'
import Progress from './pages/Progress.jsx'

const CatalogContext = createContext({ catalog: [], loading: true, error: null })

export function useCatalog () {
  return useContext(CatalogContext)
}

function TokenGate ({ onSave }) {
  const [value, setValue] = useState('')
  return (
    <div className="token-gate">
      <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()) }}>
        <h1>🏋️ Muscu</h1>
        <p>Entre le token API (variable <code>API_TOKEN</code> du serveur) :</p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Token"
          autoFocus
        />
        <button type="submit">Valider</button>
      </form>
    </div>
  )
}

export default function App () {
  const [token, setTokenState] = useState(getToken())
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const logout = useCallback(() => {
    setToken('')
    setTokenState('')
  }, [])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api('/api/exercises')
      .then((rows) => { setCatalog(rows); setError(null) })
      .catch((err) => {
        if (err.status === 401) { logout(); return }
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [token, logout])

  if (!token) {
    return <TokenGate onSave={(t) => { setToken(t); setTokenState(t) }} />
  }

  return (
    <CatalogContext.Provider value={{ catalog, loading, error }}>
      <header className="topbar">
        <span className="brand">🏋️ Muscu</span>
        <nav>
          <NavLink to="/exercises">Exercices</NavLink>
          <NavLink to="/workouts">Séances</NavLink>
          <NavLink to="/progress">Progression</NavLink>
        </nav>
        <button className="link" onClick={logout} title="Changer de token">⏻</button>
      </header>
      <main>
        {error && <div className="banner error">Erreur API : {error}</div>}
        <Routes>
          <Route path="/" element={<Navigate to="/exercises" replace />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/workouts/new" element={<WorkoutEditor />} />
          <Route path="/workouts/:id" element={<WorkoutEditor />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="*" element={<Navigate to="/exercises" replace />} />
        </Routes>
      </main>
    </CatalogContext.Provider>
  )
}
