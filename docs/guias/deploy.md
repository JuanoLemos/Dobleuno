# Guía de Deploy — Dobleuno

> **Estado:** v0.7.0 — Ola 6 cerrada.
> **Target:** Hetzner VPS (CX11 €3.29/mes) + opcional Cloudflare en frente.

---

## TL;DR

```bash
# En el VPS
git clone https://github.com/JuanoLemos/Dobleuno.git
cd Dobleuno
cp .env.production.example .env.production
# editar .env.production (secrets reales)
docker compose up -d
# Verificar:
curl http://localhost:3000/api/health
```

---

## 1. Elegir infraestructura

### Opción A: Hetzner VPS (recomendado para MVP)

- **CX11** — 1 vCPU, 2GB RAM, 20GB SSD, €3.29/mes. Suficiente para MVP con <100 usuarios.
- **CX21** — 2 vCPU, 4GB RAM, 40GB SSD, €5.39/mes. Recomendado si vas a correr pgvector con >50k chunks.
- SO: Ubuntu 22.04 LTS o Debian 12.
- Datacenter: Falkenstein (Alemania) o Helsinki (Finlandia). Elegir el más cercano a tu user base.

Setup inicial:

```bash
# SSH al server
ssh root@<server-ip>

# Crear usuario no-root
adduser deploy
usermod -aG sudo deploy
# Configurar SSH key para deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Instalar Docker
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Agregar deploy a grupo docker
sudo usermod -aG docker deploy
```

### Opción B: Fly.io / Railway / Render (PaaS)

- Pros: deploy con `git push`, HTTPS automático, sin sysadmin.
- Contras: precio más alto a escala, menos control.
- Ver sección "Adaptar para PaaS" más abajo.

---

## 2. Clonar y configurar

```bash
# Como usuario deploy
cd ~
git clone https://github.com/JuanoLemos/Dobleuno.git
cd Dobleuno

# Configurar .env.production
cat > .env.production <<EOF
# Auth
BETTER_AUTH_SECRET=<openssl rand -hex 32>
BETTER_AUTH_URL=https://dobleuno.tudominio.com

# CORS — URL de la web (si servís desde mismo dominio, mismo valor)
CORS_ORIGIN=https://dobleuno.tudominio.com

# DeepSeek (LLM)
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat

# OpenAI (embeddings — opcional, si no hay, usa deterministic dev fallback)
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Log
LOG_LEVEL=info
EOF

# Asegurar que docker-compose lea este archivo
# (Si tu docker-compose.yml no usa ${VAR}, exportalas antes:)
set -a; source .env.production; set +a
```

---

## 3. Levantar los servicios

```bash
docker compose up -d
# Espera 10-20s a que Postgres esté healthy + server termine de bootear.

# Verificar health
curl http://localhost:3000/api/health
# → {"status":"ok","service":"dobleuno-server","timestamp":"...","dependencies":{"database":"up"}}

# Ver logs
docker compose logs -f server
```

### Aplicar migraciones

```bash
# Una vez que Postgres esté healthy:
docker compose exec server node dist/db/migrate.js
# Ojo: ajustar path al dist correcto si cambia

# Aplicar migración de pgvector
docker compose exec postgres psql -U dobleuno -d dobleuno -f /docker-entrypoint-initdb.d/0001_pgvector.sql
# (o copiala via docker cp + psql)
```

### Seed inicial de KB

```bash
docker compose exec server node dist/seed-kb-chunks.js
```

---

## 4. Reverse proxy + HTTPS

### Con Caddy (recomendado — config mínima)

```bash
sudo apt install -y caddy

cat > /etc/caddy/Caddyfile <<EOF
dobleuno.tudominio.com {
  reverse_proxy localhost:3000
  encode gzip zstd
}
EOF

sudo systemctl reload caddy
# Caddy auto-provisiona certs de Let's Encrypt.
```

### Con Nginx + Certbot

```nginx
# /etc/nginx/sites-available/dobleuno
server {
    listen 80;
    server_name dobleuno.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dobleuno /etc/nginx/sites-enabled/
sudo certbot --nginx -d dobleuno.tudominio.com
```

---

## 5. Deploy de la web (cliente)

Hay 3 opciones:

### Opción 1: Cloudflare Pages (recomendado para PWA)

```bash
# Build local
cd apps/web
npm run build
# → dist/

# Subir a Cloudflare Pages:
# 1. Crear proyecto "dobleuno-web" en dashboard
# 2. Conectar repo de GitHub
# 3. Build command: cd apps/web && npm install && npm run build
# 4. Build output: apps/web/dist
# 5. Root directory: (vacío)
# 6. Env var: VITE_API_URL=https://dobleuno.tudominio.com
```

### Opción 2: Servir desde el mismo server Express

Modificar `apps/server/src/app.ts` para agregar `app.use(express.static('web-dist'))` y montar el dist del cliente en `/app/web-dist` (Dockerfile ya lo soporta comentado).

### Opción 3: Netlify / Vercel

Similar a Cloudflare Pages. Build command + output dir.

---

## 6. Backups

```bash
# Backup diario de Postgres (crontab)
0 3 * * * docker exec dobleuno-postgres pg_dump -U dobleuno dobleuno | gzip > /home/deploy/backups/db-$(date +\%F).sql.gz

# Mantener últimos 7 días
0 4 * * * find /home/deploy/backups -name "db-*.sql.gz" -mtime +7 -delete
```

---

## 7. Monitoreo mínimo

```bash
# Health check externo (cron cada 5 min)
*/5 * * * * curl -fsS https://dobleuno.tudominio.com/api/health > /dev/null || echo "ALERT: server down" | mail -s "Dobleuno down" tu@email.com
```

Para algo más serio: [UptimeRobot](https://uptimerobot.com) (gratis hasta 50 monitors) o [BetterStack](https://betterstack.com).

---

## 8. Actualizar

```bash
cd ~/Dobleuno
git pull
docker compose build server
docker compose up -d
# Migraciones nuevas (si hay)
docker compose exec server node dist/db/migrate.js
```

---

## 9. Adaptar para PaaS

### Fly.io

```toml
# fly.toml
app = "dobleuno-server"
primary_region = "ams"

[build]
  dockerfile = "apps/server/Dockerfile"

[env]
  NODE_ENV = "production"
  DATABASE_URL = "postgres://..." # Provisionar Postgres en fly.io

[[services]]
  internal_port = 3000
  protocol = "tcp"
  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Railway

1. Conectar repo en [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Agregar Postgres plugin
4. Configurar env vars
5. Deploy automático en cada push a main

---

## 10. Costos estimados (Hetzner CX11)

| Concepto | Costo/mes |
|---|---|
| VPS CX11 | €3.29 |
| Dominio (.com) | ~€1.00 |
| DeepSeek V3 (LLM) | ~€5-20 según uso |
| OpenAI embeddings (si se usa) | ~€1-5 |
| Backups (Hetzner Storage Box 1TB) | €3.81 |
| Cloudflare (free tier) | €0 |
| **Total estimado MVP** | **~€15-30/mes** |

---

## Troubleshooting

**Server arranca pero DB health = down**
```bash
docker compose logs postgres
docker compose exec postgres pg_isready -U dobleuno
```

**pgvector no se instala**
- Verificar que la imagen es `pgvector/pgvector:pg16` (no `postgres:16-alpine`).
- `docker compose exec postgres psql -U dobleuno -d dobleuno -c "SELECT * FROM pg_extension WHERE extname='vector';"`

**CORS errors en el cliente**
- Verificar `CORS_ORIGIN` en `.env.production` matchea la URL exacta del cliente (con https://).

**DEEPSEEK_API_KEY inválida**
- Verificar formato: `sk-...` (no `Bearer sk-...`).
- Ver logs: `docker compose logs server | grep -i deepseek`.

---

## Próximos pasos

- [ ] Configurar CI/CD con GitHub Actions para auto-deploy en push a main.
- [ ] Agregar Sentry o equivalente para error tracking.
- [ ] Migrar a Postgres gestionado (Hetzner Managed DB o Supabase) si el VPS se queda corto.
- [ ] CDN para assets estáticos del cliente (Cloudflare R2 o Bunny CDN).