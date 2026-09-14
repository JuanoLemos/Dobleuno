# ADR-011 — Codex en React, sin indexar, y retiro del portal Astro

| Campo | Valor |
|---|---|
| **Decisión** | El Codex se sirve desde la app React. El portal Astro se retira. Las rutas del Codex son públicas pero no indexables. |
| **Estado** | Aceptado |
| **Fecha** | 2026-09-14 |
| **Ola** | 11 (Codex en React) |
| **Supersedes** | ADR-006 en su cláusula de SEO |
| **Impacto** | Un solo deploy y un solo stack de UI. Se resigna el SEO a propósito. `portal/` deja de existir. |

## Contexto

El ROADMAP pedía para esta ola "portear las páginas Astro a React, manteniendo el SEO si es
posible". Al relevarlo aparecieron tres hechos que cambian el encuadre:

1. **No había contenido que portear.** El mirror de `tow.whfb.app` nunca capturó una regla. Los 39
   HTML de `data/raw/rule/empire/` tenían el mismo MD5: eran el shell de carga de Next.js. Las 39
   "reglas" de `data/processed/special-rules.json` eran ese shell parseado — todas con el título
   del sitio como nombre y `"No description available."` como descripción.
2. **El portal nunca se desplegó.** No estaba en CI, ni en `docker-compose.yml`, ni en la guía de
   deploy. Corrió solo en `localhost:4321`, con 0 reglas.
3. **El SEO que había que "mantener" no existía.** Sin sitemap, sin `robots.txt`, sin canonical,
   sin Open Graph, sin JSON-LD. Solo `<title>` y `<meta description>`.

El argumento de ADR-006 para conservar el portal era que las reglas son contenido estático ideal
para indexar. Ese argumento suponía que había reglas y que estaban publicadas. Ninguna de las dos
cosas era cierta.

## Decisión

### 1. El Codex vive en React

`/reglas`, `/reglas/:slug`, `/items`, `/items/:slug` y `/sobre` son rutas de `apps/web`, con la
piel `codex` aplicada por ruta (`data-skin="codex"` en el body, puesto y sacado por
`CodexLayout`). El resto de la app no se entera.

Los datos vienen de la API (`/api/rules`, `/api/items`), no bundleados. El corpus son ~3 MB de
texto derivado de material de Games Workshop, y `doc/Sources.md` dice que no se redistribuye:
meterlo en el artefacto versionado sería exactamente eso. Va del server a IndexedDB, que es del
usuario, y desde ahí el Codex se lee sin señal.

### 2. Público, pero no indexado

Las rutas del Codex emiten `<meta name="robots" content="noindex, nofollow">` y
`apps/web/public/robots.txt` las desalienta.

`doc/legal/ANALISIS-LICENCIAS-COMPLIANCE.md` marca a Games Workshop como riesgo latente 🔴, y
`doc/Sources.md` dice que el contenido no se redistribuye. Una traducción al español del texto de
GW, pública **e indexada**, es la configuración más expuesta posible. Se elige la que no lo es.

Esto es una decisión de riesgo, no una técnica: robots.txt y `noindex` son peticiones, no
controles de acceso.

### 3. El portal se retira

`portal/` se borra entero. Su última versión está en el tag `v1.1.0`, commit
`babd1591bf854f2153656d7e2201c63706558e21`, por si alguna vez hace falta mirarla.

## Consecuencias

### Positivas

- Un solo stack de UI, un solo build, un solo deploy.
- El filtro `/reglas?cat=<sección>` finalmente funciona: la home del portal linkeaba ahí desde la
  Ola 6 y `reglas/index.astro` nunca leyó los search params.
- La búsqueda es server-side sobre las 1796 reglas, no un filtro de DOM sobre lo que ya está en la
  página.
- El Codex queda offline-first: lo que se navegó se lee sin señal.

### Negativas

- Se pierde la posibilidad de tráfico orgánico. Es deliberado, y es reversible sacando el
  `noindex`.
- Los unfurls de Discord y WhatsApp no van a mostrar título ni descripción: esos bots no ejecutan
  JS y ven el `<head>` del `index.html`. Arreglarlo pide un middleware de Open Graph por
  user-agent en el server; queda fuera.
- El primer render del Codex necesita al server. Sin base, 503 y lo que haya en cache.

### Trade-offs aceptados

- **SSG/SSR (`vite-react-ssg`) no entra.** Solo tendría sentido para el SEO, que acabamos de
  resignar. Si algún día el riesgo legal se despeja y el tráfico lo justifica, se reabre.
- **Las unidades no entran al Codex** en esta ola. Están en la base y en la API, pero la UI cubre
  reglas e items.

## Reversibilidad

Sacar el `noindex` y el `robots.txt` es un commit. Volver a Astro no: `portal/` se borró, y hay que
sacarlo del tag `v1.1.0`. La reversión que importa — volver a indexar — es la barata.
