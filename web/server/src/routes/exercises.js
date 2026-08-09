function parseExercise (row) {
  return {
    ...row,
    secondary_muscles: JSON.parse(row.secondary_muscles || '[]'),
    ...(row.instruction_steps_fr !== undefined
      ? { instruction_steps_fr: JSON.parse(row.instruction_steps_fr || '[]') }
      : {})
  }
}

export default async function exercisesRoutes (app) {
  const { db } = app

  // GET /api/exercises?q=&muscle=&equipment=&body_part=
  app.get('/exercises', async (req) => {
    const { q, muscle, equipment, body_part: bodyPart } = req.query
    const where = []
    const params = {}
    if (q) { where.push('name LIKE @q'); params.q = `%${q}%` }
    if (muscle) { where.push('(target = @muscle OR muscle_group = @muscle)'); params.muscle = muscle }
    if (equipment) { where.push('equipment = @equipment'); params.equipment = equipment }
    if (bodyPart) { where.push('body_part = @bodyPart'); params.bodyPart = bodyPart }

    const rows = db.prepare(`
      SELECT id, name, category, body_part, target, muscle_group,
             secondary_muscles, equipment, image_path, gif_path
      FROM exercises
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY name
    `).all(params)
    return rows.map(parseExercise)
  })

  app.get('/exercises/filters', async () => {
    const col = (name) => db.prepare(`SELECT DISTINCT ${name} AS v FROM exercises WHERE ${name} IS NOT NULL ORDER BY v`).all().map(r => r.v)
    return {
      targets: col('target'),
      muscle_groups: col('muscle_group'),
      equipment: col('equipment'),
      body_parts: col('body_part')
    }
  })

  app.get('/exercises/:id', async (req, reply) => {
    const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id)
    if (!row) return reply.code(404).send({ error: 'exercise not found' })
    return parseExercise(row)
  })

  // Historique d'un exo pour l'écran Progression
  app.get('/exercises/:id/progress', async (req) => {
    const rows = db.prepare(`
      SELECT s.id AS session_id, s.started_at, s.finished_at, s.created_at,
             ss.reps, ss.weight
      FROM session_sets ss
      JOIN session_exercises se ON se.id = ss.session_exercise_id
      JOIN sessions s          ON s.id  = se.session_id
      WHERE se.exercise_id = ?
      ORDER BY COALESCE(s.finished_at, s.started_at, s.created_at), s.id, ss.position
    `).all(String(req.params.id))

    const bySession = new Map()
    for (const r of rows) {
      if (!bySession.has(r.session_id)) {
        bySession.set(r.session_id, {
          session_id: r.session_id,
          date: r.finished_at || r.started_at || r.created_at,
          sets: []
        })
      }
      bySession.get(r.session_id).sets.push({ reps: r.reps, weight: r.weight })
    }
    return [...bySession.values()]
  })
}
