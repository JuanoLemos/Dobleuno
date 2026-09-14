# Dockerfile de Dobleuno — un solo contenedor sirve la API y el cliente.
#
# Build:
#   docker build -f apps/server/Dockerfile -t dobleuno-server .
# Run:
#   docker compose up -d
#
# ── Qué cambió en la Ola 12 ───────────────────────────────────────────────
#
# Este archivo nunca se había construido con éxito: el stage `build` corría
# `npm run build -w @dobleuno/shared`, y ese script no existe — `packages/shared`
# es type-only, apunta su `main` al `.ts` y sólo declara `typecheck`. El build
# fallaba siempre, y nadie se enteró porque el CI no tocaba Docker.
#
# Además la imagen era API-only: el cliente no se construía acá ni entraba de
# ninguna otra forma, así que el "deploy unificado" del ROADMAP no tenía
# soporte. Ahora el web se buildea en el stage `build` y se sirve desde el
# mismo Express, mismo origen, sin CORS.

# ─── Stage 1: deps ─────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Los package.json de TODOS los workspaces del lockfile. Sin el de web,
# `npm ci` queda desincronizado: el lockfile lo declara como workspace.
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# --legacy-peer-deps por conflictos con better-auth peerOptional
RUN npm ci --legacy-peer-deps

# ─── Stage 2: build ────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/
COPY apps/web/ ./apps/web/

# El cliente, con la API en el mismo origen: vacío = URLs relativas.
# Si esto quedara con un valor, la imagen serviría sólo para ese dominio.
ENV VITE_API_URL=""
RUN npm run build -w @dobleuno/web

# El server. Su `build` es `tsc` + copiar los .sql al dist: `tsc` sólo emite
# JavaScript, y sin los .sql el contenedor no puede migrar la base.
RUN npm run build -w @dobleuno/server

# ─── Stage 3: dependencias de producción ───────────────────────────────────
#
# Instalación limpia en vez de `npm prune --omit=dev` sobre el árbol de build.
#
# El prune borraba TODAS las dependencias, no sólo las de desarrollo: la raíz
# del monorepo no declara ninguna —todo vive en los workspaces— así que prune
# no encontraba nada que conservar. El contenedor moría en el primer import
# (`Cannot find package 'dotenv'`), con dotenv correctamente declarado en
# apps/server. `npm ci --omit=dev` lee el lockfile y respeta los workspaces.
FROM node:22-alpine AS proddeps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --omit=dev --legacy-peer-deps

# ─── Stage 4: runtime ──────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV WEB_DIST_DIR=/app/web-dist

COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/apps/server/.env.example ./apps/server/.env.example
COPY --from=build /app/apps/web/dist ./web-dist
COPY --from=build /app/package.json ./package.json

# `packages/shared` es type-only —los 14 imports del server son `import type` y
# TypeScript los borra al compilar—, pero sigue siendo un workspace declarado,
# así que npm deja un symlink en node_modules. Se copia para que ese link
# resuelva en vez de quedar colgado.
COPY --from=build /app/packages/shared ./packages/shared

RUN addgroup -g 1001 -S nodejs && adduser -S dobleuno -u 1001 -G nodejs

# Ola 10 — Los directorios de datos tienen que existir Y ser del usuario que
# corre el proceso ANTES de que Docker cree los volúmenes: un volumen nombrado
# hereda dueño y permisos del path dentro de la imagen. Si el path no existe,
# Docker lo crea root:root y el server (uid 1001) no puede escribir.
RUN mkdir -p /app/uploads/cronicas /app/data && chown -R dobleuno:nodejs /app/uploads /app/data

USER dobleuno

EXPOSE 3000

# Apunta a /ready, no a /health: el primero devuelve 503 sin base, el segundo
# devuelve 200 siempre. Con /health, un contenedor sin Postgres quedaba
# `healthy` para siempre.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/ready || exit 1

CMD ["node", "apps/server/dist/index.js"]
