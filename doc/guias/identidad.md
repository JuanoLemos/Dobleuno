<!-- ADAPTAR: Reemplazar Dobleuno por el nombre real del proyecto. Ajustar el template de documento si el proyecto tiene otro formato preferido. -->
# Guía de Identidad — Dobleuno

Recomendaciones de identidad y estilo para proyectos que adoptan Diligencia.

---

## Propósito

Esta guía establece convenciones de identidad, formato y estilo para la documentación del proyecto. No es obligatoria, pero su uso consistente mejora la legibilidad y profesionalismo del repositorio.

---

## Plantilla de Documento

Todo documento nuevo puede comenzar con este header estándar:

```markdown
# [Título del documento]

**Empresa:** [Nombre de la empresa o individuo]
**Sistema:** [Nombre del sistema]
**Autor:** [Nombre del autor]
**Fecha:** YYYY-MM-DD
**Estado:** [DRAFT | REVIEW | FINAL]
**Versión:** X.Y.Z

---
```

---

## Reglas de Escritura

### Nombres de archivos y directorios

- **Mayúsculas sostenidas** para archivos de alto nivel: `README.md`, `DILIGENCIA.md`, `CLAUDE.md`
- **kebab-case** para archivos de contenido: `guia-de-uso.md`, `doc/arch/adr-template.md`
- **Consistencia**: no mezclar `snake_case`, `PascalCase` y `kebab-case` en el mismo proyecto

### Referencias en texto

- **Primera mención**: nombre completo del sistema o componente
- **Subsecuentes**: nombre corto o sigla
- **Evitar**: "nuestro proyecto", "la herramienta", "el sistema" — usar nombres concretos

### Fechas y versiones

- **Fechas**: ISO 8601 (`YYYY-MM-DD`) — obligatorio
- **Versiones**: semver 3-partes (`v1.0.0`, `v2.3.1`) — recomendado

---

## Template para Nuevos Documentos

```markdown
# [Título]

**Empresa:** [Nombre]
**Sistema:** [Nombre]
**Autor:** [Nombre]
**Fecha:** YYYY-MM-DD
**Estado:** [DRAFT | REVIEW | FINAL]
**Versión:** 1.0

---

## CONTEXTO

[Descripción del contexto]

## [Secciones relevantes]

---

**Referencias:**
- [Enlaces a documentos relacionados]

**Historial de versiones:**
| Fecha | Versión | Cambio | Autor |
|---|---|---|---|
| YYYY-MM-DD | 1.0 | Creación inicial | [Nombre] |
```

---

## Referencias

- `DILIGENCIA.md` — convención de estructura del proyecto
- `ROADMAP.md` — seguimiento de versiones y features
