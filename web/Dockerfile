# ---------- Étape 1 : build du front React ----------
FROM node:22-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---------- Étape 2 : deps du serveur (better-sqlite3 = module natif) ----------
FROM node:22-bookworm-slim AS server-deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- Étape 3 : image finale (compatible ARM / Raspberry Pi) ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
# Attendus au runtime (volumes) : /app/data (SQLite) et /app/dataset (images/GIF/JSON)
EXPOSE 3000
CMD ["node", "server/src/index.js"]
