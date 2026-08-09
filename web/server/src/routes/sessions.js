import { numOrNull } from '../util.js'

export default async function sessionsRoutes (app) {
  const { db } = app

  // POST /api/sessions — contrat montre:
  // { workout_id, started_at, finished_at, exercises: [ { exercise_id, sets: [ { reps, weight } ] } ] } -> 201
  app.post('/sessions', async (req, reply) => {
    const body = req.body
    if (!body || !Array.isArray(body.exercises)) {
      return reply.code(400).send({ error: 'body must contain exercises[]' })
    }
    for (const ex of body.exercises) {
      if (!ex.exercise_id || !Array.isArray(ex.sets)) {
        return reply.code(400).send({ error: 'each exercise needs exercise_id and sets[]' })
      }
    }

    const tx = db.transaction(() => {
      const sessionId = db.prepare(`
        INSERT INTO sessions (workout_id, started_at, finished_at) VALUES (?, ?, ?)
      `).run(
        body.workout_id ?? null,
        body.started_at ?? null,
        body.finished_at ?? null
      ).lastInsertRowid

      const exStmt = db.prepare('INSERT INTO session_exercises (session_id, exercise_id, position) VALUES (?, ?, ?)')
      const setStmt = db.prepare('INSERT INTO session_sets (session_exercise_id, position, reps, weight) VALUES (?, ?, ?, ?)')
      body.exercises.forEach((ex, i) => {
        const seId = exStmt.run(sessionId, String(ex.exercise_id), i).lastInsertRowid
        ex.sets.forEach((s, j) => setStmt.run(seId, j, numOrNull(s.reps), numOrNull(s.weight)))
      })
      return sessionId
    })

    const id = tx()
    return reply.code(201).send({ id })
  })

  app.get('/sessions', async () => {
    return db.prepare(`
      SELECT s.id, s.workout_id, w.name AS workout_name,
             s.started_at, s.finished_at, s.created_at
      FROM sessions s
      LEFT JOIN workouts w ON w.id = s.workout_id
      ORDER BY COALESCE(s.finished_at, s.started_at, s.created_at) DESC, s.id DESC
    `).all()
  })

  app.get('/sessions/:id', async (req, reply) => {
    const s = db.prepare(`
      SELECT s.id, s.workout_id, w.name AS workout_name,
             s.started_at, s.finished_at, s.created_at
      FROM sessions s
      LEFT JOIN workouts w ON w.id = s.workout_id
      WHERE s.id = ?
    `).get(req.params.id)
    if (!s) return reply.code(404).send({ error: 'session not found' })

    const exRows = db.prepare(`
      SELECT se.id AS se_id, se.exercise_id, e.name
      FROM session_exercises se
      LEFT JOIN exercises e ON e.id = se.exercise_id
      WHERE se.session_id = ?
      ORDER BY se.position
    `).all(s.id)
    const setsStmt = db.prepare(`
      SELECT reps, weight FROM session_sets
      WHERE session_exercise_id = ? ORDER BY position
    `)
    return {
      ...s,
      exercises: exRows.map(ex => ({
        exercise_id: ex.exercise_id,
        name: ex.name ?? ex.exercise_id,
        sets: setsStmt.all(ex.se_id)
      }))
    }
  })

  app.delete('/sessions/:id', async (req, reply) => {
    const info = db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id)
    if (info.changes === 0) return reply.code(404).send({ error: 'session not found' })
    return reply.code(204).send()
  })
}
