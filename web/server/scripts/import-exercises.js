#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb, migrate } from '../src/db.js'
import { importDataset } from '../src/importDataset.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..') // dossier web/
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data')
const DATASET_DIR = process.env.DATASET_DIR || path.join(ROOT, 'dataset')

const db = openDb(path.join(DATA_DIR, 'muscu.db'))
migrate(db)
const n = importDataset(db, DATASET_DIR)
console.log(`✅ ${n} exercices importés dans ${path.join(DATA_DIR, 'muscu.db')}`)
