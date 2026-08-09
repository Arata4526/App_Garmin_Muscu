import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export function openDb (dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function migrate (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id                   TEXT PRIMARY KEY,
      name                 TEXT NOT NULL,
      category             TEXT,
      body_part            TEXT,
      target               TEXT,
      muscle_group         TEXT,
      secondary_muscles    TEXT NOT NULL DEFAULT '[]',
      equipment            TEXT,
      instructions_fr      TEXT,
      instruction_steps_fr TEXT NOT NULL DEFAULT '[]',
      image_path           TEXT,
      gif_path             TEXT
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id  INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      position    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      position            INTEGER NOT NULL,
      reps                INTEGER,
      weight              REAL,
      rest                INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id  INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
      started_at  TEXT,
      finished_at TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_exercises (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      position    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_sets (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
      position            INTEGER NOT NULL,
      reps                INTEGER,
      weight              REAL
    );

    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_we           ON workout_sets(workout_exercise_id);
    CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_exercises_exo     ON session_exercises(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_session_sets_se           ON session_sets(session_exercise_id);
  `)
}
