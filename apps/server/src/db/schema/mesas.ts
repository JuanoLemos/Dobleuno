/**
 * Schema Ola 9 — Mesas / Sesiones / Reservas (calendar multi-mesa).
 *
 * Modelo:
 *   mesa      → las mesas físicas del club (capacidad 2/4/6/8).
 *   sesion    → una "fecha de juego" en una mesa específica.
 *   reserva   → un jugador anotado para una sesión (constraint único sesion+user).
 *
 * Decisiones locked (ver doc/arch/ADR-009-calendar-data-model.md):
 *   - Capacidad por mesa (no por sesión).
 *   - Reserva con listId opcional (integra con armybuilder si el user tiene lista).
 *   - GET público de mesas/sesiones/reservas (anima a registrarse).
 *   - Soft delete de mesas (activa=false), hard delete de sesiones (cascade reservas).
 *   - TZ: server UTC, UI America/Buenos_Aires.
 *
 * Single-tenant en MVP: un deploy = un club. Multi-club va a Fase 2.
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './users.js';
import { lists } from './lists.js';

/** Formato de puntos de la sesión (TOW oficial). */
export const formatoSesionEnum = pgEnum('formato_sesion', ['2000', '2500', 'open']);

// ─── Mesas ────────────────────────────────────────────────────────────────

export const mesas = pgTable(
  'mesas',
  {
    /** UUID v4. */
    id: text('id').primaryKey(),
    /** "Mesa 1", "Mesa grande", "Mesa de la ventana", etc. */
    nombre: text('nombre').notNull(),
    /** Cupos por sesión: 2 / 4 / 6 / 8. */
    capacidad: integer('capacidad').notNull(),
    /** Soft delete: false = mesa deshabilitada, no aparece en GET público. */
    activa: boolean('activa').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    activaIdx: index('mesas_activa_idx').on(t.activa),
  }),
);

// ─── Sesiones ─────────────────────────────────────────────────────────────

export const sesiones = pgTable(
  'sesiones',
  {
    id: text('id').primaryKey(),
    mesaId: text('mesa_id')
      .notNull()
      .references(() => mesas.id, { onDelete: 'cascade' }),
    /** Fecha/hora de la sesión en UTC. UI convierte a America/Buenos_Aires. */
    fecha: timestamp('fecha', { withTimezone: true }).notNull(),
    /** Formato de puntos: 2000 / 2500 / open. */
    formato: formatoSesionEnum('formato').notNull(),
    /** Notas opcionales del admin (ej: "Traer reglamento impreso"). */
    notas: text('notas'),
    /** Quién publicó la sesión. */
    adminUserId: text('admin_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    fechaIdx: index('sesiones_fecha_idx').on(t.fecha),
    mesaIdx: index('sesiones_mesa_idx').on(t.mesaId),
  }),
);

// ─── Reservas ─────────────────────────────────────────────────────────────

export const reservas = pgTable(
  'reservas',
  {
    id: text('id').primaryKey(),
    sesionId: text('sesion_id')
      .notNull()
      .references(() => sesiones.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** FK opcional a una lista del armybuilder del user. */
    listId: text('list_id').references(() => lists.id, { onDelete: 'set null' }),
    /** Notas del jugador (ej: "Llego 10 min tarde"). */
    notas: text('notas'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    /** Anti-doble-booking: un user no puede reservar dos veces la misma sesión. */
    sesionUserUnique: uniqueIndex('reservas_sesion_user_unique').on(t.sesionId, t.userId),
    sesionIdx: index('reservas_sesion_idx').on(t.sesionId),
    userIdx: index('reservas_user_idx').on(t.userId),
  }),
);

export type MesaRow = typeof mesas.$inferSelect;
export type NewMesaRow = typeof mesas.$inferInsert;
export type SesionRow = typeof sesiones.$inferSelect;
export type NewSesionRow = typeof sesiones.$inferInsert;
export type ReservaRow = typeof reservas.$inferSelect;
export type NewReservaRow = typeof reservas.$inferInsert;