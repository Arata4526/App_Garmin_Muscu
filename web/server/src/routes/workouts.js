import { numOrNull } from '../util.js'

export default async function workoutsRoutes (app) {
  const { db } = app

  function getWorkout (id) {
    const w = db.prepare('SELECT id, name FROM workouts WHERE id = ?').get(id)
    if (!w) return null
    const exRows = db.prepare(`
      SELECT we.id AS we_id, we.exercise_id, e.name
      FROM workout_exercises we
      LEFT JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = ?
      ORDER BY we.position
    `).all(id)
    const setsStmt = db.prepare(`
      SELECT reps, weight, rest FROM workout_sets
      WHERE workout_exercise_id = ? ORDER BY position
    `)
    // Contrat: { id, name, exercises: [ { exercise_id, name, sets: [ { reps, weight, rest } ] } ] }
    return {
      id: w.id,
      name: w.name,
      exercises: exRows.map(ex => ({
        exercise_id: ex.exercise_id,
        name: ex.name ?? ex.exercise_id,
        sets: setsStmt.all(ex.we_id)
      }))
    }
  }

  function validateBody (body, reply) {
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      reply.code(400).send({ error: 'name (string) is required' })
      return false
    }
    if (!Array.isArray(body.exercises)) {
      reply.code(400).send({ error: 'exercises must be an array' })
      return false
    }
    for (const ex of body.exercises) {
      if (!ex.exercise_id || !Array.isArray(ex.sets)) {
        reply.code(400).send({ error: 'each exercise needs exercise_id and sets[]' })
        return false
      }
    }
    return true
  }

  const replaceExercises = (workoutId, exercises) => {
    db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(workoutId)
    const exStmt = db.prepare('INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)')
    const setStmt = db.prepare('INSERT INTO workout_sets (workout_exercise_id, position, reps, weight, rest) VALUES (?, ?, ?, ?, ?)')
    exercises.forEach((ex, i) => {
      const weId = exStmt.run(workoutId, String(ex.exercise_id), i).lastInsertRowid
      ex.sets.forEach((s, j) => {
        setStmt.run(weId, j, numOrNull(s.reps), numOrNull(s.weight), numOrNull(s.rest))
      })
    })
  }

  app.get('/workouts', async () => {
    return db.prepare('SELECT id, name FROM workouts ORDER BY name').all()
  })

  app.get('/workouts/:id', async (req, reply) => {
    const w = getWorkout(req.params.id)
    if (!w) return reply.code(404).send({ error: 'workout not found' })
    return w
  })

  app.post('/workouts', async (req, reply) => {
    const body = req.body
    if (!validateBody(body, reply)) return reply
    const tx = db.transaction(() => {
      const id = db.prepare('INSERT INTO workouts (name) VALUES (?)').run(body.name.trim()).lastInsertRowid
      replaceExercises(id, body.exercises)
      return id
    })
    const id = tx()
    return reply.code(201).send(getWorkout(id))
  })

  app.put('/workouts/:id', async (req, reply) => {
    const body = req.body
    if (!validateBody(body, reply)) return reply
    const tx = db.transaction(() => {
      const info = db.prepare('UPDATE workouts SET name = ? WHERE id = ?').run(body.name.trim(), req.params.id)
      if (info.changes === 0) return false
      replaceExercises(req.params.id, body.exercises)
      return true
    })
    if (!tx()) return reply.code(404).send({ error: 'workout not found' })
    return getWorkout(req.params.id)
  })

  app.delete('/workouts/:id', async (req, reply) => {
    const info = db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id)
    if (info.changes === 0) return reply.code(404).send({ error: 'workout not found' })
    return reply.code(204).send()
  })
}
