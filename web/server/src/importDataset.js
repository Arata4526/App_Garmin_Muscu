import fs from 'node:fs'
import path from 'node:path'

const LIST_FIELDS = `
  id, name, category, body_part, target, muscle_group,
  secondary_muscles, equipment, image_path, gif_path
`

export function datasetFile (datasetDir) {
  return path.join(datasetDir, 'data', 'exercises.json')
}

export function importDataset (db, datasetDir) {
  const file = datasetFile(datasetDir)
  if (!fs.existsSync(file)) {
    throw new Error(`Dataset introuvable: ${file} (cloner https://github.com/hasaneyldrm/exercises-dataset dans ${datasetDir})`)
  }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'))

  const insert = db.prepare(`
    INSERT OR REPLACE INTO exercises (
      id, name, category, body_part, target, muscle_group,
      secondary_muscles, equipment, instructions_fr, instruction_steps_fr,
      image_path, gif_path
    ) VALUES (
      @id, @name, @category, @body_part, @target, @muscle_group,
      @secondary_muscles, @equipment, @instructions_fr, @instruction_steps_fr,
      @image_path, @gif_path
    )
  `)

  const run = db.transaction((items) => {
    for (const r of items) {
      insert.run({
        id: String(r.id),
        name: r.name ?? '',
        category: r.category ?? null,
        body_part: r.body_part ?? null,
        target: r.target ?? null,
        muscle_group: r.muscle_group ?? null,
        secondary_muscles: JSON.stringify(r.secondary_muscles ?? []),
        equipment: r.equipment ?? null,
        instructions_fr: r.instructions?.fr ?? r.instructions?.en ?? null,
        instruction_steps_fr: JSON.stringify(r.instruction_steps?.fr ?? r.instruction_steps?.en ?? []),
        image_path: r.image ?? null,
        gif_path: r.gif_url ?? null
      })
    }
  })

  run(rows)
  return rows.length
}

/** Importe le catalogue si la table est vide (démarrage Docker sur le Pi). */
export function autoImportIfEmpty (db, datasetDir, logger = console) {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM exercises').get()
  if (c > 0) return 0
  if (!fs.existsSync(datasetFile(datasetDir))) {
    logger.warn?.(`Dataset absent de ${datasetDir} — catalogue vide. Lancer "npm run import" après avoir cloné le dataset.`)
    return 0
  }
  const n = importDataset(db, datasetDir)
  logger.info?.(`Import automatique: ${n} exercices chargés depuis le dataset`)
  return n
}

export const EXERCISE_LIST_FIELDS = LIST_FIELDS
