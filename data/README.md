# Dobleuno · data/

Esta carpeta es para datos generados por el mirror de tow.whfb.app. **No se commitea al repo** (ver `.gitignore` raíz).

## Estructura

```
data/
├── raw/                  # HTML scrapeado de tow.whfb.app
│   ├── empire/
│   │   ├── greatswords.html
│   │   ├── handgunners.html
│   │   └── ...
│   ├── bretonnia/
│   └── special-rules/
│       ├── great-weapon.html
│       └── ...
└── processed/            # JSON parseado (output del parser)
    ├── empire.json
    ├── bretonnia.json
    └── special-rules.json
```

## Regenerar

```bash
# 1) Levantar Postgres
npm run db:up

# 2) Mirror (descarga HTML desde tow.whfb.app)
npm run mirror -- --faction=empire --rate-limit=2000

# 3) Parse (HTML → JSON)
npm run parse -- --faction=empire

# 4) Ingest a Postgres
npm run ingest -- --faction=empire

# O todo en uno
npm run kb:rebuild -- --faction=empire
```
