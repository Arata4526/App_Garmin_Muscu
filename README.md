# App Muscu — Garmin Vivoactive 3

Application perso de musculation : le web sert à gérer le catalogue d'exercices,
construire des séances (workouts) et suivre sa progression ; la montre Garmin
récupère les séances et renvoie les résultats réels.

## Structure du monorepo

```
├── web/                 # API Fastify + SQLite + front React (cette partie)
│   ├── server/          # API Node.js (Fastify) + better-sqlite3
│   │   ├── src/         # index.js, db.js, routes/
│   │   └── scripts/     # import-exercises.js (dataset -> SQLite)
│   ├── client/          # front React (Vite)
│   ├── dataset/         # clone de exercises-dataset (NON versionné)
│   ├── data/            # base SQLite (NON versionnée)
│   ├── Dockerfile       # image tout-en-un (front buildé + API + statique)
│   └── docker-compose.yml
└── watch/               # app Connect IQ (Garmin) — autre brique
```

## Prérequis

- Node.js ≥ 20 (dev local) **ou** Docker + Docker Compose (déploiement)
- Le dataset d'exercices (≈ 300 Mo, 1324 exos, images 180×180 + GIFs) :

```bash
cd web
git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset.git dataset
```

## Lancement en dev (local)

```bash
# 1) API (port 3000)
cd web/server
npm install
export API_TOKEN=dev-token-123     # sous Windows: set API_TOKEN=...
npm run import                     # importe les 1324 exos dans web/data/muscu.db
npm run dev                        # http://localhost:3000

# 2) Front (port 5173, proxy /api et /static vers :3000)
cd web/client
npm install
npm run dev                        # http://localhost:5173
```

Le front demande le token au premier chargement (stocké en localStorage).

## Lancement en prod (Raspberry Pi, Docker)

Sur le Pi (image multi-arch, testée sur ARM64) :

```bash
cd web
git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset.git dataset
cp .env.example .env               # puis éditer: API_TOKEN=<token long aléatoire>
docker compose up -d --build
```

- App complète sur `http://<ip-du-pi>:3000` (front + API + GIFs).
- L'import du catalogue est **automatique** au premier démarrage si la table est vide
  (sinon : `docker compose exec app node server/scripts/import-exercises.js`).
- La base SQLite persiste dans `web/data/`, le dataset est monté en lecture seule.

### Reverse proxy HTTPS

L'app écoute en HTTP sur le port 3000 ; le TLS est terminé par le reverse proxy.
Exemple Caddy pour `muscu.alexisbousquet.fr` :

```
muscu.alexisbousquet.fr {
    reverse_proxy 127.0.0.1:3000
}
```

Exemple nginx :

```nginx
server {
    server_name muscu.alexisbousquet.fr;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Authentification

Toutes les routes `/api/*` (sauf `/api/health`) exigent :

```
Authorization: Bearer <API_TOKEN>
```

Le token est défini côté serveur par la variable d'environnement `API_TOKEN`.
Les fichiers statiques `/static/*` (images/GIF, non sensibles) sont publics.

## Contrat d'API (consommé par l'app montre)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/exercises` | Catalogue complet. Filtres optionnels : `?q=`, `?muscle=`, `?equipment=`, `?body_part=` |
| `GET` | `/api/workouts` | `[ { id, name } ]` |
| `GET` | `/api/workouts/:id` | `{ id, name, exercises: [ { exercise_id, name, sets: [ { reps, weight, rest } ] } ] }` (`rest` en secondes) |
| `POST` | `/api/sessions` | Body : `{ workout_id, started_at, finished_at, exercises: [ { exercise_id, sets: [ { reps, weight } ] } ] }` → `201 { id }` |

Routes additionnelles utilisées par le front :

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/exercises/:id` | Détail + instructions FR (`instructions_fr`, `instruction_steps_fr[]`) |
| `GET` | `/api/exercises/:id/progress` | Historique `[ { session_id, date, sets: [ { reps, weight } ] } ]` |
| `POST`/`PUT`/`DELETE` | `/api/workouts[/:id]` | Édition des séances |
| `GET`/`DELETE` | `/api/sessions[/:id]` | Historique / suppression de sessions |
| `GET` | `/api/health` | Healthcheck (sans auth) |

Notes :
- `exercise_id` = identifiant **string** du dataset (ex : `"0025"`).
- `image_path` / `gif_path` sont relatifs : préfixer avec `/static/`
  (ex : `/static/images/0025-xxx.jpg`, `/static/videos/0025-xxx.gif`).

## Modèle de données (SQLite)

- `exercises` — catalogue importé (id, name, category, body_part, target, muscle_group, secondary_muscles, equipment, instructions_fr, image/gif)
- `workouts` + `workout_exercises` + `workout_sets` — modèles de séances (reps/charge/repos **cibles**)
- `sessions` + `session_exercises` + `session_sets` — séances réalisées (reps/charge **réels** renvoyés par la montre)
