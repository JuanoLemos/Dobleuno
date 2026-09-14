/**
 * Schema Ola 10 — Crónicas (relato de batalla + galería de fotos).
 *
 * Modelo:
 *   cronica       → el relato de una batalla terminada, más su metadata de generación.
 *   cronica_foto  → una foto de esa partida (archivo en disco + metadata).
 *
 * Decisiones locked (ver doc/arch/ADR-010-cronicas-data-model.md):
 *   - Tablas propias, no campos dentro del jsonb `battles.data`: el PATCH del
 *     tracker reescribe ese jsonb entero y pisaría las fotos subidas en paralelo.
 *   - Una crónica por batalla (UNIQUE en battle_id).
 *   - La crónica puede existir sin texto: se crea al subir la primera foto o al
 *     abrir el modal de generación, lo que pase primero.
 *   - Visibilidad elegida por el autor, default privada.
 *   - Tono como enum cerrado: lo manda el cliente pero el server no acepta texto libre.
 *   - `filename` guarda solo el nombre del archivo, no la ruta ni la URL: el
 *     directorio sale de UPLOADS_DIR y la URL se arma al serializar. Mover el
 *     storage (o migrar a S3) no obliga a reescribir filas.
 *
 * Single-tenant en MVP: un deploy = un club.
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './users.js';
import { battles } from './battles.js';
import type { Ancla } from '@dobleuno/shared';

/** Registro narrativo del relato. */
export const tonoCronicaEnum = pgEnum('tono_cronica', ['cronista', 'epico', 'sobrio']);

/** Quién puede leer la crónica. */
export const visibilidadCronicaEnum = pgEnum('visibilidad_cronica', ['privada', 'publica']);

// ─── Crónicas ─────────────────────────────────────────────────────────────

export const cronicas = pgTable(
  'cronicas',
  {
    /** UUID v4. */
    id: text('id').primaryKey(),
    battleId: text('battle_id')
      .notNull()
      .references(() => battles.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Por default, el nombre de la batalla. El autor puede cambiarlo. */
    titulo: text('titulo').notNull(),
    /** null = la crónica existe (puede tener fotos) pero el relato no se generó. */
    texto: text('texto'),
    visibilidad: visibilidadCronicaEnum('visibilidad').notNull().default('privada'),
    tono: tonoCronicaEnum('tono').notNull().default('cronista'),
    /** Preferencia de estilo que escribió el autor (cap 500 en la ruta). */
    promptUsuario: text('prompt_usuario'),
    /** CRONICA_PROMPT_VERSION vigente al generar. */
    promptVersion: text('prompt_version'),
    /** Modelo que generó el texto, o 'mock' si corrió sin API key. */
    modelo: text('modelo'),
    /** Marcadores [u:N]/[h:N] que sobrevivieron a la validación contra la batalla. */
    anclas: jsonb('anclas').$type<Ancla[]>().notNull().default([]),
    /** Avisos de la validación (ej: una unidad mencionada que no peleó). */
    warnings: jsonb('warnings').$type<string[]>().notNull().default([]),
    /** Cuántas veces se regeneró. Con tope, para no quemar tokens. */
    generaciones: integer('generaciones').notNull().default(0),
    generatedAt: timestamp('generated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    /** Una crónica por batalla. */
    battleUnique: uniqueIndex('cronicas_battle_unique').on(t.battleId),
    userIdx: index('cronicas_user_idx').on(t.userId),
    /** Feed del club: las públicas, más recientes primero. */
    feedIdx: index('cronicas_feed_idx').on(t.visibilidad, t.updatedAt),
  }),
);

// ─── Fotos ────────────────────────────────────────────────────────────────

export const cronicaFotos = pgTable(
  'cronica_fotos',
  {
    id: text('id').primaryKey(),
    cronicaId: text('cronica_id')
      .notNull()
      .references(() => cronicas.id, { onDelete: 'cascade' }),
    /** Quién la subió. Hoy siempre el dueño de la crónica. */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** '<uuid>.<ext>', relativo a UPLOADS_DIR/cronicas. Nunca el nombre original. */
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    bytes: integer('bytes').notNull(),
    ancho: integer('ancho'),
    alto: integer('alto'),
    epigrafe: text('epigrafe'),
    orden: integer('orden').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    filenameUnique: uniqueIndex('cronica_fotos_filename_unique').on(t.filename),
    cronicaIdx: index('cronica_fotos_cronica_idx').on(t.cronicaId),
  }),
);

export type CronicaRow = typeof cronicas.$inferSelect;
export type NewCronicaRow = typeof cronicas.$inferInsert;
export type CronicaFotoRow = typeof cronicaFotos.$inferSelect;
export type NewCronicaFotoRow = typeof cronicaFotos.$inferInsert;
