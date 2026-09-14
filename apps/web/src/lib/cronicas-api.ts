/**
 * Crónicas API client — Ola 10.
 *
 * GET    /api/cronicas                   → mías + públicas del club
 * GET    /api/cronicas/:id               → detalle con fotos
 * GET    /api/cronicas/batalla/:battleId → la crónica de una batalla mía
 * POST   /api/cronicas                   → crear desde una batalla terminada
 * PATCH  /api/cronicas/:id               → título, visibilidad, tono
 * DELETE /api/cronicas/:id
 * POST   /api/cronicas/:id/generar       → generar o regenerar el relato
 * POST   /api/cronicas/:id/fotos         → subir foto (multipart)
 * DELETE /api/cronicas/:id/fotos/:fotoId
 */
import { api, ApiError } from './api.js';
import { env } from './env.js';
import type { Cronica, CronicaFoto, TonoCronica, VisibilidadCronica } from '@dobleuno/shared';

export interface GenerarInput {
  tono?: TonoCronica;
  promptUsuario?: string | null;
}

export interface UpdateCronicaInput {
  titulo?: string;
  visibilidad?: VisibilidadCronica;
  tono?: TonoCronica;
}

export const cronicasApi = {
  async list(): Promise<Cronica[]> {
    const res = await api<{ count: number; cronicas: Cronica[] }>('/api/cronicas');
    return res.cronicas;
  },

  get(id: string): Promise<Cronica> {
    return api<Cronica>(`/api/cronicas/${id}`);
  },

  /** La crónica de una batalla, o null si todavía no existe. */
  async porBatalla(battleId: string): Promise<Cronica | null> {
    try {
      return await api<Cronica>(`/api/cronicas/batalla/${battleId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  create(battleId: string, titulo?: string): Promise<Cronica> {
    return api<Cronica>('/api/cronicas', { method: 'POST', body: { battleId, titulo } });
  },

  update(id: string, input: UpdateCronicaInput): Promise<Cronica> {
    return api<Cronica>(`/api/cronicas/${id}`, { method: 'PATCH', body: input });
  },

  remove(id: string): Promise<void> {
    return api<void>(`/api/cronicas/${id}`, { method: 'DELETE' });
  },

  generar(id: string, input: GenerarInput = {}): Promise<Cronica> {
    return api<Cronica>(`/api/cronicas/${id}/generar`, { method: 'POST', body: input });
  },

  /**
   * Sube una foto.
   *
   * No usa `api()` a propósito: ese wrapper siempre hace `JSON.stringify` del
   * body y fuerza `Content-Type: application/json`. Para multipart hay que
   * dejar que el browser ponga el header, porque tiene que incluir el boundary
   * que él mismo genera — si lo seteamos a mano, el server no puede parsear.
   */
  async uploadFoto(cronicaId: string, file: Blob, filename = 'foto.jpg'): Promise<CronicaFoto> {
    const form = new FormData();
    form.append('foto', file, filename);

    const res = await fetch(`${env.VITE_API_URL}/api/cronicas/${cronicaId}/fotos`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });

    const contentType = res.headers.get('content-type') ?? '';
    const data: unknown = contentType.includes('application/json')
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const body = data as { error?: string; details?: string } | string;
      const message =
        typeof body === 'string' ? body : (body?.details ?? body?.error ?? `HTTP ${res.status}`);
      throw new ApiError(res.status, data, message);
    }
    return data as CronicaFoto;
  },

  removeFoto(cronicaId: string, fotoId: string): Promise<void> {
    return api<void>(`/api/cronicas/${cronicaId}/fotos/${fotoId}`, { method: 'DELETE' });
  },
};

/** URL absoluta de una foto: el server la sirve desde su propio origen. */
export function fotoUrl(foto: CronicaFoto): string {
  return `${env.VITE_API_URL}${foto.url}`;
}
