# MECANICA-AUDIO — Síntesis de voz con ElevenLabs v1.0.0

## Propósito

Estandarizar cómo el agente genera y reproduce audio (texto a voz) en cualquier proyecto
Diligencia, para que el comportamiento sea idéntico sin importar en qué proyecto esté abierta
la sesión. Nace de un bug real: cada proyecto reaprendía esto por separado (memoria de Claude
es por proyecto, no global), generando configuraciones divergentes e inconsistentes.

## Servidor MCP

| Campo | Valor |
|---|---|
| Paquete | `elevenlabs-mcp` (PyPI) |
| Registro | `claude mcp add elevenlabs --scope user --env ELEVENLABS_API_KEY=<key> -- <ruta>\elevenlabs-mcp.exe` |
| Scope | `user` — global, disponible en todos los proyectos sin re-registrar |
| Config | `~/.claude.json` → `mcpServers.elevenlabs` (NO usar `claude_desktop_config.json` — es de la app "Claude" clásica, no de Claude Code) |

## Parámetros de voz (canónicos)

| Parámetro | Valor | Nota |
|---|---|---|
| `voice_id` | `nbcvT3C2tyOd2OsRAtUf` | Maya — voz latina/porteña, amable |
| `model_id` | `eleven_flash_v2_5` | Rápido (~5-10s). Primera generación de una sesión puede tardar más (timeout ocasional de ElevenLabs) |
| `stability` | `0.65` | Tono sobrio/uniforme. Más bajo = más expresivo y variable |
| `output_directory` | `C:\Users\jlemo\Desktop` | Salida de los .mp3 generados |

## Reproducción — método obligatorio

**NUNCA usar:**
- `mcp__elevenlabs__play_audio` — cuelga indefinidamente, solo arranca si se cancela la llamada (bug del tool en este entorno Windows)
- `start "archivo.mp3"` a secas — abre el reproductor por defecto, que puede tomar otro mp3 de una cola/librería en vez del archivo pedido (confirmado con Groove Music)

**Usar siempre:**
```powershell
Start-Process "C:\Users\jlemo\Desktop\archivo.mp3"
```

Abre el reproductor visible del usuario apuntando al archivo exacto — async, no bloquea la sesión, stoppable por el usuario (play/pausa/stop/volumen desde la ventana).

## Triggers de activación

| Frase del usuario | Acción |
|---|---|
| "leeme esto" / "leeme" | Generar mp3 + `Start-Process` (reproductor visible) |
| "dame audio" / "generá audio" | Idéntico — mismo comportamiento, no hay modo "silencioso" en Claude Code Desktop |

## Texto: prosa natural obligatoria

Antes de mandar cualquier texto a `text_to_speech`, reescribirlo como prosa hablada natural:

- ❌ Bullets ("-"), numeración de lista ("1.", "2."), "N/A", emojis (✅🔴🟡🔧 etc.)
- ✅ Oraciones completas, conectores naturales ("primero...", "además...", "por otro lado...")

ElevenLabs vocaliza mal el formato markdown: lee guiones en voz alta, dice "ene barra a" para
"N/A", intenta pronunciar emojis como sonidos. Confirmado funcionando correctamente con prosa
limpia.

## Adopción en proyectos

Esta mecánica se instala en proyectos nuevos vía `/adaptar` Flujo A (copiada desde el template).
En proyectos ya adaptados, se sincroniza vía `/adaptar` Flujo C — Fase 2.5 (sincronización de
guías/mecánicas de referencia).

El servidor MCP (`elevenlabs-mcp`, scope `user`) solo se registra una vez por máquina — no por
proyecto. Si `claude mcp list` no muestra `elevenlabs: ✓ Connected`, hay que instalar y
registrar el servidor (ver tabla arriba) antes de que esta mecánica tenga efecto.

## Archivos relacionados

| Archivo | Rol |
|---|---|
| `~/.claude.json` | Config del servidor MCP (`mcpServers.elevenlabs`) |
| `~/.claude/templates/diligencia-doc-base/doc/mecanicas/MECANICA-AUDIO.md` | Copia fuente para `/adaptar` |
| `INDEX.md` | Catálogo de mecánicas del proyecto |
| `MECANICA-AUDIO.md` | Este archivo |
