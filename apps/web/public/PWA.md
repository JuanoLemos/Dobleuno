# Dobleuno · PWA

Referencia: https://web.dev/articles/install-criteria

Configurado via `vite-plugin-pwa` (ver `vite.config.ts`).

## Manifest

- `name`: "Dobleuno"
- `short_name`: "Dobleuno"
- `display`: "standalone" (PWA full-screen)
- `theme_color`: `#a01919` (blood)
- `background_color`: `#0a0a0a` (forge)
- `start_url`: "/"
- `scope`: "/"

## Iconos

- `192x192` (PWA standard)
- `512x512` (PWA standard)
- `512x512 maskable` (Android adaptive icon)
- `180x180` (Apple touch icon, home screen)

Generados con `node scripts/generate-icons.mjs` desde `public/sigil.svg`.

## Service Worker

- **Precache** del shell (HTML, JS, CSS, fonts, icons)
- **NetworkFirst** para `/api/*` con fallback a cache, timeout 5s
- **CacheFirst** para fonts (woff2/ttf) con expiración 30 días
- **autoUpdate** — nuevas versiones se aplican al refrescar

## Dev

PWA está **deshabilitado en dev** (`devOptions.enabled: false`) para no complicar el HMR. En prod, build genera el service worker.

## Instalación

- **iOS Safari**: "Compartir" → "Añadir a pantalla de inicio"
- **Chrome Android**: banner automático de instalación
- **Desktop Chrome/Edge**: ícono de install en la barra de URL
