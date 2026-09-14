# Guía de deploy — Dobleuno

> **Estado:** v2.0.0 — Ola 12 (deploy consolidado).
> **Target:** un VPS con Docker. Un `docker compose`, un contenedor sirviendo API y cliente.

## Lo que hay que saber antes de empezar

**La imagen nunca se probó fuera de CI.** No hay Docker en la máquina del autor, así que el único
lugar donde el stack se levantó completo es el runner de GitHub Actions: construye la imagen, corre
`docker compose up`, verifica cinco endpoints y consulta la base. Nadie la puso todavía en un
servidor real. Si sos el primero, esperá fricción y anotá lo que encuentres.

**El corpus no viene en la imagen.** `doc/Sources.md` dice que el contenido de tow.whfb.app no se
redistribuye, y publicar una imagen con el corpus adentro sería redistribuirlo. Se copia al volumen
como paso del deploy (§4).

---

## 1. Requisitos

- Un VPS con Docker y el plugin de compose. Cualquier proveedor sirve; con 2 vCPU y 4 GB alcanza y
  sobra para un club.
- Un dominio apuntando al servidor.
- Una API key de DeepSeek con saldo. Verificala **antes** de deployar:
  ```bash
  npm run deepseek:doctor
  ```
  Recorre key → TLS → autenticación → saldo → una generación real, y el primer paso que falla es la
  causa. Si el oráculo no anda, empezá por ahí.

Instalación de Docker en Debian/Ubuntu:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # cerrá sesión y volvé a entrar
```

---

## 2. Configurar

```bash
git clone https://github.com/JuanoLemos/Dobleuno.git
cd Dobleuno
cp .env.production.example .env
```

Editá `.env`. Las marcadas OBLIGATORIA abortan el `docker compose up` si faltan, y el schema del
server las vuelve a exigir al arrancar:

```bash
POSTGRES_PASSWORD=$(openssl rand -base64 24)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=https://dobleuno.tuclub.ar     # tu origen público, sin barra final
DEEPSEEK_API_KEY=sk-...
ADMIN_EMAILS=vos@tuclub.ar
```

Tres cosas que no son obvias:

- **`CORS_ORIGIN` va vacío.** La API y el cliente comparten origen, así que no hay CORS que
  habilitar. Sólo completala si vas a servir el cliente desde otro dominio.
- **`OPENAI_API_KEY` no se setea.** Ese provider de embeddings devuelve 1536 dimensiones y la
  columna es `vector(384)`: con la key puesta, el seed deja los vectores en NULL y el oráculo deja
  de encontrar nada — sin errores visibles. El server se niega a arrancar si la detecta.
- **No pongas un placeholder en `BETTER_AUTH_SECRET`.** Hay una lista negra: el valor de ejemplo que
  traía el compose tenía 35 caracteres y pasaba cualquier regla de longitud.

---

## 3. Levantar

```bash
docker compose up -d --wait
```

Eso hace tres cosas en orden: espera a que Postgres esté healthy, corre el servicio `migrate` —que
aplica las migraciones de Drizzle y después pgvector, y **sale**— y recién entonces arranca el
server. Si `migrate` falla, `up` falla y el contenedor queda exited con sus logs intactos:

```bash
docker compose logs migrate
```

Verificar:

```bash
curl -fsS localhost:3000/api/health/ready    # 200 con "database": "up"
curl -fsS localhost:3000/ | head -5          # el HTML del cliente
```

`/api/health` responde 200 siempre (liveness, que es lo que quiere un orquestador).
`/api/health/ready` devuelve **503** si la base no está: ahí apunta el `HEALTHCHECK` de la imagen.

---

## 4. Cargar el corpus

El pipeline corre en una máquina con el repo, no en el servidor: el servidor no tiene por qué
re-bajar 3124 páginas de tow.whfb.app.

En tu máquina:

```bash
npm run rules:sync          # mirror → parse → validate → translate → validate
```

Son unos 96 minutos la primera vez, con rate limit de 2s y cache en disco. El paso de validación
corta si el corpus sale degenerado; existe porque este pipeline terminó en verde durante dos meses
escribiendo 39 entradas basura.

Después, al servidor:

```bash
scp -r data/translated dobleuno@tu-vps:/tmp/corpus
# en el servidor:
docker compose cp /tmp/corpus dobleuno-server:/app/data/translated
docker compose run --rm server node apps/server/dist/seed-kb-chunks.js
```

Son 2,9 MB. El seed carga las tres tablas del Codex más los chunks del oráculo, y **falla si algún
chunk queda sin vector**: una tabla llena de NULLs es un oráculo muerto que no lo dice.

Si no corriste el traductor, copiá `data/processed` en vez de `data/translated`. El Codex muestra
inglés y lo declara en `/sobre`.

> `/api/admin/kb/sync` **no funciona en producción**: carga los scripts del pipeline por dynamic
> import de archivos `.ts`, que Node no puede importar y que no se copian a la imagen. El endpoint
> lo dice con ese mensaje en vez de quedarse colgado.

---

## 5. Reverse proxy y HTTPS

Con Caddy, que resuelve el certificado solo:

```
dobleuno.tuclub.ar {
    reverse_proxy localhost:3000
}
```

```bash
sudo apt install caddy && sudo systemctl reload caddy
```

**Detrás del proxy, `NODE_ENV=production` activa `trust proxy` en Express.** Sin eso, Express ve la
conexión como HTTP, better-auth no setea las cookies `secure` y el login falla en HTTPS con un
síntoma incomprensible: el request de auth devuelve 200 y la sesión no persiste.

Postgres está publicado en `127.0.0.1:5432`, no en `0.0.0.0`. Si necesitás entrar desde afuera, usá
un túnel SSH; no lo expongas.

---

## 6. Backups

Tres volúmenes, y no valen lo mismo:

| Volumen | Qué es | ¿Backup? |
|---|---|---|
| `dobleuno-pgdata` | La base: usuarios, listas, batallas, crónicas | **Sí** |
| `dobleuno-uploads` | Las fotos de las crónicas | **Sí** — es dato irremplazable |
| `dobleuno-kbdata` | Cache del mirror y del parser | No: se regenera con `rules:sync` |

```bash
# Postgres, diario
0 3 * * * docker exec dobleuno-postgres pg_dump -U dobleuno dobleuno | gzip > ~/backups/db-$(date +\%F).sql.gz
0 4 * * * find ~/backups -name 'db-*.sql.gz' -mtime +7 -delete

# Fotos, semanal
0 5 * * 0 docker run --rm -v dobleuno-uploads:/data -v ~/backups:/backup alpine \
  tar czf /backup/uploads-$(date +\%F).tar.gz -C /data .
```

Un `docker volume rm dobleuno-uploads` se lleva las fotos del club y no hay de dónde recuperarlas.
Por eso va en un volumen separado del cache de la KB: el día que alguien borre ese cache para forzar
un re-sync, no se lleva las fotos puestas.

---

## 7. Actualizar

```bash
cd ~/Dobleuno
git pull
docker compose up -d --build --wait
```

El servicio `migrate` corre solo en cada `up` y es idempotente. No hay paso manual de migraciones.

---

## 8. Cuando algo no anda

| Síntoma | Causa probable |
|---|---|
| `up` aborta con "falta POSTGRES_PASSWORD" | No copiaste `.env.production.example` a `.env`, o la dejaste vacía |
| El server no arranca y lista variables inválidas | Es el guard de producción. El mensaje dice cuál y por qué |
| `migrate` sale con código ≠ 0 | `docker compose logs migrate`. Suele ser la base todavía inicializándose |
| El login devuelve 200 y la sesión no persiste | Falta el reverse proxy, o `BETTER_AUTH_URL` no coincide con el origen real |
| El oráculo contesta "no tengo información suficiente" a todo | Corré `npm run deepseek:doctor`. Si la key está bien, revisá que el seed haya cargado los chunks |
| 500 al subir una foto, con `EACCES` en el log | El volumen se creó antes de que la imagen tuviera el directorio. Recreá el volumen con la imagen actualizada |
| El Codex se ve vacío | Falta el corpus: §4 |

---

## Lo que esta guía no cubre

Deploy automático (no hay workflow de CD ni registry de imágenes), monitoreo y alerting, escalado
horizontal —el mutex de `kb-sync` es in-memory, así que dos réplicas se pisarían—, y Postgres
gestionado. Ver el ROADMAP.
