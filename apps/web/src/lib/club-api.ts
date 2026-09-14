/**
 * Club API client — Ola 8.
 *
 * GET  /api/club   → info del club (público)
 * PUT  /api/club   → actualizar (admin)
 *
 * Usa fetch estándar, sin dependencias. Manejo de errores tipado.
 */

export interface ClubInfo {
  id: number;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  horarios: string | null;
  contactoEmail: string | null;
  contactoWhatsapp: string | null;
  discord: string | null;
  redes: Record<string, string>;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export type ClubInfoUpdate = Partial<{
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  horarios: string | null;
  contactoEmail: string | null;
  contactoWhatsapp: string | null;
  discord: string | null;
  redes: Record<string, string>;
}>;

const BASE = '/api/club';

export const clubApi = {
  async get(): Promise<ClubInfo> {
    const res = await fetch(BASE, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Failed to fetch club info: ${res.status}`);
    }
    return res.json() as Promise<ClubInfo>;
  },

  async update(payload: ClubInfoUpdate): Promise<ClubInfo> {
    const res = await fetch(BASE, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to update club info: ${res.status}`);
    }
    return res.json() as Promise<ClubInfo>;
  },
};