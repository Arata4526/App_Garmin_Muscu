import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb, migrate } from './db.js'
import { autoImportIfEmpty } from './importDataset.js'
import exercisesRoutes from './routes/exercises.js'
import workoutsRoutes from './routes/workouts.js'
import sessionsRoutes from './routes/sessions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..') // dossier web/

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data')
const DATASET_DIR = process.env.DATASET_DIR || path.join(ROOT, 'dataset')
const CLIENT_DIST = process.env.CLIENT_DIST || path.join(ROOT, 'client', 'dist')
const API_TOKEN = process.env.API_TOKEN || ''

const app = Fastify({ logger: true })

// --- DB ---
const db = openDb(path.join(DATA_DIR, 'muscu.db'))
migrate(db)
autoImportIfEmpty(db, DATASET_DIR, app.log)
app.decorate('db', db)

// --- Auth Bearer sur /api/* (sauf /api/health) ---
app.addHook('onRequest', async (req, reply) => {
  const url = (req.raw.url || '').split('?')[0]
  if (!url.startsWith('/api') || url === '/api/health') return
  if (!API_TOKEN) {
    return reply.code(500).send({ error: 'API_TOKEN environment variable is not set' })
  }
  if ((req.headers.authorization || '') !== `Bearer ${API_TOKEN}`) {
    return reply.code(401).send({ error: 'unauthorized' })
  }
})

app.get('/api/health', async () => ({ ok: true }))

// --- Statique: images + GIFs du dataset (/static/images/..., /static/videos/...) ---
if (fs.existsSync(DATASET_DIR)) {
  app.register(fastifyStatic, {
    root: DATASET_DIR,
    prefix: '/static/',
    decorateReply: false,
    maxAge: '7d'
  })
} else {
  app.log.warn(`DATASET_DIR ${DATASET_DIR} absent — images/GIF non servis`)
}

// --- Statique: front React buildé (SPA) ---
if (fs.existsSync(CLIENT_DIST)) {
  app.register(fastifyStatic, { root: CLIENT_DIST, prefix: '/' })
  app.setNotFoundHandler((req, reply) => {
    const url = (req.raw.url || '').split('?')[0]
    if (url.startsWith('/api') || url.startsWith('/static')) {
      return reply.code(404).send({ error: 'not found' })
    }
    return reply.sendFile('index.html')
  })
}

// --- Routes API ---
app.register(exercisesRoutes, { prefix: '/api' })
app.register(workoutsRoutes, { prefix: '/api' })
app.register(sessionsRoutes, { prefix: '/api' })

try {
  await app.listen({ port: PORT, host: HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
