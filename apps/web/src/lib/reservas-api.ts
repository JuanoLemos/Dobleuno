/**
 * Reservas API client — Ola 9 Día 2.
 *
 * GET    /api/sesiones/:id/reservas
 * POST   /api/sesiones/:id/reservar       (auth)
 * DELETE /api/sesiones/:id/reservar/:rid  (dueño o admin)
 * GET    /api/mis-reservas                 (auth)
 *
 * Sigue el patrón del wrapper `api()` con credentials + tipado.
 */
import { api } from './api.js';
import type { Sesion } from './mesas-api.js';
import type { Mesa } from './mesas-api.js';

export interface Reserva {
  id: string;
  sesionId: string;
  userId: string;
  listId: string | null;
  notas: string | null;
  createdAt: string;
}

/** Reserva con datos públicos del user (de GET /api/sesiones/:id/reservas). */
export interface ReservaPublica {
  id: string;
  userId: string;
  userName: string | null;
  listId: string | null;
  notas: string | null;
  createdAt: string;
}

/** Reserva + sesión + mesa (de GET /api/mis-reservas). */
export interface MiReserva {
  reserva: {
    id: string;
    listId: string | null;
    notas: string | null;
    createdAt: string;
  };
  sesion: Sesion;
  mesa: Pick<Mesa, 'id' | 'nombre' | 'capacidad'>;
}

export interface NewReserva {
  listId?: string | null;
  notas?: string | null;
}

export const reservasApi = {
  /** Jugadores anotados (sin emails). Público. */
  async list(sesionId: string): Promise<ReservaPublica[]> {
    const data = await api<{ count: number; reservas: ReservaPublica[] }>(
      `/sesiones/${sesionId}/reservas`,
    );
    return data.reservas;
  },

  /** Reservar plaza (auth). Devuelve 409 si ya hay reserva o mesa llena. */
  async create(sesionId: string, payload: NewReserva = {}): Promise<Reserva> {
    return api<Reserva>(`/sesiones/${sesionId}/reservar`, {
      method: 'POST',
      body: payload,
    });
  },

  /** Cancelar reserva propia (admin puede cancelar cualquiera). */
  async cancel(sesionId: string, reservaId: string): Promise<void> {
    await api<void>(`/sesiones/${sesionId}/reservar/${reservaId}`, {
      method: 'DELETE',
    });
  },

  /** Mis sesiones futuras con reserva (auth). */
  async misReservas(): Promise<MiReserva[]> {
    const data = await api<{ count: number; reservas: MiReserva[] }>('/mis-reservas');
    return data.reservas;
  },
};