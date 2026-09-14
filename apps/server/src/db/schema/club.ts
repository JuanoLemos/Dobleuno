/**
 * Schema Ola 8 — Info del club (single row, id=1).
 *
 * Una sola fila con la info pública del club:
 *   nombre, dirección, horarios, contacto, redes (IG/Discord/etc),
 *   descripción corta, fecha fundación.
 *
 * GET público (sin auth) — la app muestra el banner del club a todos.
 * PUT requiere admin (middleware requireAdmin).
 *
 * En MVP es single-tenant: un deploy = un club. Multi-club va a Fase 2.
 */
import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { user } from './users.js';

export const clubInfo = pgTable('club_info', {
  /** Siempre 1. La fila se siembra al boot si no existe. */
  id: integer('id').primaryKey().default(1),
  /** Nombre del club (público). */
  nombre: text('nombre').notNull(),
  /** Descripción corta (1-2 frases). */
  descripcion: text('descripcion'),
  /** Dirección física. */
  direccion: text('direccion'),
  /** Texto libre de horarios (ej: "Sábados 14–22hs, Martes 19–23hs"). */
  horarios: text('horarios'),
  /** Email de contacto. */
  contactoEmail: text('contacto_email'),
  /** WhatsApp (con prefijo país, ej: "+5491155555555"). */
  contactoWhatsapp: text('contacto_whatsapp'),
  /** Discord invite code o URL. */
  discord: text('discord'),
  /** Redes sociales — mapa libre { ig?, fb?, tw? }. */
  redes: jsonb('redes').$type<Record<string, string>>().default({}),
  /** Quién editó por última vez. */
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ClubInfoRow = typeof clubInfo.$inferSelect;
export type NewClubInfoRow = typeof clubInfo.$inferInsert;