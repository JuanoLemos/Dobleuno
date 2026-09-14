/**
 * Mesas API client — Ola 9.
 *
 * GET    /api/mesas
 * POST   /api/mesas           (admin)
 * PUT    /api/mesas/:id       (admin)
 * DELETE /api/mesas/:id       (admin)
 *
 * GET    /api/sesiones?mesaId=&includePast=
 * GET    /api/sesiones/:id
 * POST   /api/sesiones        (admin)
 * PUT    /api/sesiones/:id    (admin)
 * DELETE /api/sesiones/:id    (admin)
 *
 * Reservas (POST/DELETE /api/sesiones/:id/reservar) viven en reservas-api.ts (Día 2).
 *
 * Usa el wrapper `api()` con credentials + manejo de errores tipado.
 */
import { api } from './api.js';

export type FormatoSesion = '2000' | '2500' | 'open';
export type CapacidadMesa = 2 | 4 | 6 | 8;

export interface Mesa {
  id: string;
  nombre: string;
  capacidad: CapacidadMesa;
  activa: boolean;
  createdAt: string;
}

export interface Sesion {
  id: string;
  mesaId: string;
  /** ISO 8601 con offset. */
  fecha: string;
  formato: FormatoSesion;
  notas: string | null;
  adminUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewMesa {
  nombre: string;
  capacidad: CapacidadMesa;
}

export interface UpdateMesa {
  nombre?: string;
  capacidad?: CapacidadMesa;
  activa?: boolean;
}

export interface NewSesion {
  mesaId: string;
  /** ISO 8601 con offset, ej: "2026-07-15T17:00:00-03:00". */
  fecha: string;
  formato: FormatoSesion;
  notas?: string | null;
}

export interface UpdateSesion {
  mesaId?: string;
  fecha?: string;
  formato?: FormatoSesion;
  notas?: string | null;
}

// ─── Mesas ────────────────────────────────────────────────────────────────

export const mesasApi = {
  /** Lista de mesas activas. Público. */
  async list(): Promise<Mesa[]> {
    const data = await api<{ count: number; mesas: Mesa[] }>('/mesas');
    return data.mesas;
  },

  /** Crear mesa (admin). */
  async create(payload: NewMesa): Promise<Mesa> {
    return api<Mesa>('/mesas', { method: 'POST', body: payload });
  },

  /** Editar mesa (admin). */
  async update(id: string, payload: UpdateMesa): Promise<Mesa> {
    return api<Mesa>(`/mesas/${id}`, { method: 'PUT', body: payload });
  },

  /** Soft delete mesa (admin). */
  async remove(id: string): Promise<{ ok: true; mesa: Mesa }> {
    return api<{ ok: true; mesa: Mesa }>(`/mesas/${id}`, { method: 'DELETE' });
  },
};

// ─── Sesiones ─────────────────────────────────────────────────────────────

export interface ListSesionesParams {
  mesaId?: string;
  includePast?: boolean;
}

export const sesionesApi = {
  /** Lista de sesiones (default: solo futuras). Público. */
  async list(params: ListSesionesParams = {}): Promise<Sesion[]> {
    const data = await api<{ count: number; sesiones: Sesion[] }>('/sesiones', {
      query: {
        mesaId: params.mesaId,
        includePast: params.includePast ? 'true' : undefined,
      },
    });
    return data.sesiones;
  },

  /** Traer una sesión específica. Público. */
  async get(id: string): Promise<Sesion> {
    return api<Sesion>(`/sesiones/${id}`);
  },

  /** Crear sesión (admin). */
  async create(payload: NewSesion): Promise<Sesion> {
    return api<Sesion>('/sesiones', { method: 'POST', body: payload });
  },

  /** Editar sesión (admin). */
  async update(id: string, payload: UpdateSesion): Promise<Sesion> {
    return api<Sesion>(`/sesiones/${id}`, { method: 'PUT', body: payload });
  },

  /** Borrar sesión (admin). Cascade a reservas. */
  async remove(id: string): Promise<void> {
    await api<void>(`/sesiones/${id}`, { method: 'DELETE' });
  },
};