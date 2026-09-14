/**
 * Ola 10 — Downscale de fotos antes de subirlas.
 *
 * La foto se saca con el celular en la mesa del club: sale de 3-5 MB y con
 * datos móviles. Bajarla a ~1600px de lado largo en WebP la deja en unos
 * cientos de KB, y le ahorra al server meter `sharp`/libvips en una imagen
 * alpine solo para hacer lo mismo del otro lado.
 *
 * Si algo falla (canvas bloqueado, formato raro, imagen corrupta) devolvemos el
 * archivo original: el límite de 8 MB del server queda como red de seguridad.
 */

/** Lado largo máximo de la imagen subida. */
const MAX_LADO = 1600;

/** Calidad del WebP. 0.82 es el punto donde el artefacto todavía no se ve. */
const CALIDAD = 0.82;

export interface FotoLista {
  blob: Blob;
  filename: string;
  /** true si se pudo reducir; false si va el original. */
  redimensionada: boolean;
}

/**
 * Reduce una imagen manteniendo la proporción. Nunca tira: ante cualquier
 * problema devuelve el archivo tal cual vino.
 */
export async function prepararFoto(file: File): Promise<FotoLista> {
  const original: FotoLista = { blob: file, filename: file.name, redimensionada: false };

  // Un archivo ya chico no gana nada con el round-trip por el canvas.
  if (file.size < 400 * 1024) return original;

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));

    // Ya está dentro del límite: no reencodear para no perder calidad de gusto.
    if (escala === 1 && file.size < 2 * 1024 * 1024) {
      bitmap.close();
      return original;
    }

    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return original;
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', CALIDAD);
    });
    if (!blob) return original;

    // Si el "reducido" pesa más que el original, el original gana.
    if (blob.size >= file.size) return original;

    const base = file.name.replace(/\.[^.]+$/, '');
    return { blob, filename: `${base}.webp`, redimensionada: true };
  } catch {
    return original;
  }
}
