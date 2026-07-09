# Dockerfile para Dobleuno server.
#
# Build:
#   docker build -f apps/server/Dockerfile -t dobleuno-server .
# Run (con docker-compose):
#   docker compose up -d
#
# Multi-stage build para minimizar tamaño de imagen.

# ─── Stage 1: deps ─────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Copiamos package.json de workspaces + lockfile
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# Install con --legacy-peer-deps por conflictos con better-auth peerOptional
RUN npm ci --legacy-peer-deps

# ─── Stage 2: build ────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

# Copiamos el código fuente
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

# Build shared primero (lo necesita server para compilar)
RUN npm run build -w @dobleuno/shared

# Build server
RUN npm run build -w @dobleuno/server

# Limpieza: solo prod deps para runtime
RUN npm prune --omit=dev --legacy-peer-deps

# ─── Stage 3: runtime ──────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiamos solo lo necesario desde build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/apps/server/.env.example ./apps/server/.env.example
COPY --from=build /app/package.json ./package.json

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S dobleuno -u 1001 -G nodejs
USER dobleuno

EXPOSE 3000

# Healthcheck (usa /api/health del server)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/server/dist/index.js"]