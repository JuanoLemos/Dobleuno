/**
 * Ola 10 — Storage de archivos subidos por usuarios (fotos de crónicas).
 *
 * Es el primer lugar del proyecto donde el server escribe archivos de usuario.
 * Reglas que no se negocian:
 *
 *   1. El tipo se decide por los magic bytes del contenido, nunca por el
 *      Content-Type que manda el cliente ni por la extensión del nombre.
 *   2. El nombre original se descarta entero: es un vector de path traversal y
 *      no aporta nada. El archivo en disco se llama `<uuid>.<ext>`.
 *   3. Nada de SVG: es un vector ejecutable, y servirlo inline es XSS.
 *
 * La resolución del directorio sigue el patrón de kb-sync.ts:
 * `custom > env.UPLOADS_DIR > <repo-root>/uploads`.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from '../env.js';
import { log } from './logger.js';

/** Tipos de imagen aceptados, con su extensión canónica en disco. */
const MIMES_PERMITIDOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type MimePermitido = keyof typeof MIMES_PERMITIDOS;

/** Tamaño máximo por archivo. El cliente además hace downscale antes de subir. */
export const MAX_BYTES_FOTO = 8 * 1024 * 1024;

/** Tope de fotos por crónica. */
export const MAX_FOTOS_POR_CRONICA = 12;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directorio raíz de uploads.
 *
 * En Docker es el volumen `dobleuno-uploads` montado en /app/uploads. En dev,
 * `<repo-root>/uploads` resuelto desde este archivo (no desde cwd, que cambia
 * según desde dónde se lance el server).
 */
export function resolveUploadsDir(custom?: string): string {
  if (custom) return path.resolve(custom);
  if (env.UPLOADS_DIR) return path.resolve(env.UPLOADS_DIR);
  return path.resolve(__dirname, '../../../../uploads');
}

/** Subdirectorio de las fotos de crónicas. */
export function cronicasDir(custom?: string): string {
  return path.join(resolveUploadsDir(custom), 'cronicas');
}

/**
 * Detecta el tipo real de la imagen leyendo sus magic bytes.
 * Devuelve null si no es ninguno de los tipos permitidos.
 *
 * No confiamos en el Content-Type del multipart: es texto que manda el cliente.
 */
export function sniffImageMime(buf: Buffer): MimePermitido | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: 'RIFF' .... 'WEBP'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

/** Extensión canónica de un mime permitido. */
export function extensionDe(mime: MimePermitido): string {
  return MIMES_PERMITIDOS[mime];
}

const NOMBRE_ARCHIVO_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/**
 * Valida que un filename venido de la DB sea exactamente `<uuid>.<ext>` y
 * devuelve su ruta absoluta.
 *
 * Es defensa en profundidad: los nombres los generamos nosotros, pero si
 * alguna vez una fila queda con basura, no queremos que un `..` se traduzca en
 * un unlink fuera del directorio.
 */
export function safeUploadPath(filename: string, custom?: string): string | null {
  if (!NOMBRE_ARCHIVO_RE.test(filename)) return null;
  const dir = cronicasDir(custom);
  const full = path.join(dir, filename);
  // path.join ya normaliza, pero confirmamos que no se escapó del directorio.
  if (!full.startsWith(dir + path.sep)) return null;
  return full;
}

export interface FotoGuardada {
  filename: string;
  mime: MimePermitido;
  bytes: number;
}

/**
 * Persiste el buffer de una foto. Devuelve null si el contenido no es una
 * imagen de los tipos permitidos.
 */
export async function saveUpload(buf: Buffer, custom?: string): Promise<FotoGuardada | null> {
  const mime = sniffImageMime(buf);
  if (!mime) return null;

  const filename = `${randomUUID()}.${extensionDe(mime)}`;
  const dir = cronicasDir(custom);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buf);

  return { filename, mime, bytes: buf.length };
}

/**
 * Borra un archivo. No tira si ya no está: el objetivo es que no quede el
 * archivo, y si alguien lo borró antes, el objetivo ya se cumplió.
 */
export async function deleteUpload(filename: string, custom?: string): Promise<void> {
  const full = safeUploadPath(filename, custom);
  if (!full) {
    log.warn('deleteUpload: filename inválido, se ignora', { filename });
    return;
  }
  try {
    await unlink(full);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      log.warn('deleteUpload falló', { filename, error: (err as Error).message });
    }
  }
}

/** URL pública de una foto. El server la sirve con express.static. */
export function urlDeFoto(filename: string): string {
  return `/api/media/cronicas/${filename}`;
}
