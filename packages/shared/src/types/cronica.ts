/**
 * Ola 10 — Crónicas: relato de una batalla + galería de fotos.
 *
 * Acá vive solo lo que cruza cliente ↔ server. Las fechas viajan como `string`
 * ISO (igual que BattleState); el tipo de la fila en la DB sale de
 * `$inferSelect` en el schema de Drizzle, no de este archivo.
 *
 * El contexto que se le arma al LLM (`CronicaContext`) no está acá a propósito:
 * lo construye y lo consume solo el server.
 */

/** Registro narrativo del relato. Elegido por el autor al generar. */
export type TonoCronica = 'cronista' | 'epico' | 'sobrio';

/** Quién puede leer la crónica. Default `privada`. */
export type VisibilidadCronica = 'privada' | 'publica';

/**
 * Referencia del relato a un dato real de la batalla.
 *
 * El LLM ancla lo que afirma con marcadores `[u:N]` (unidad) y `[h:N]` (hito
 * del log); el server los valida contra el estado real y descarta los que no
 * correspondan. Una `Ancla` es un marcador que sobrevivió a esa validación.
 */
export interface Ancla {
  tipo: 'unidad' | 'hito';
  /** El N del marcador `[u:N]` / `[h:N]`. */
  indice: number;
  /** `BattleUnit.id` o `BattleLogEntry.id` según el tipo. */
  ref: string;
  /** Nombre de la unidad o texto del hito, para que la UI pueda resaltarlo. */
  texto: string;
}

export interface CronicaFoto {
  id: string;
  cronicaId: string;
  /** URL servible: `/api/media/cronicas/<uuid>.<ext>`. */
  url: string;
  mime: string;
  bytes: number;
  ancho: number | null;
  alto: number | null;
  epigrafe: string | null;
  orden: number;
  createdAt: string;
}

export interface Cronica {
  id: string;
  battleId: string;
  userId: string;
  /** Solo en el feed del club. Nunca se expone el email del autor. */
  autorNombre?: string;
  titulo: string;
  /** `null` = la crónica existe (puede tener fotos) pero el relato no se generó. */
  texto: string | null;
  visibilidad: VisibilidadCronica;
  tono: TonoCronica;
  /** Preferencia de estilo que escribió el autor en el modal. */
  promptUsuario: string | null;
  /** `CRONICA_PROMPT_VERSION` vigente al generar. */
  promptVersion: string | null;
  /** Modelo que generó el texto, o `'mock'` si corrió sin API key. */
  modelo: string | null;
  anclas: Ancla[];
  /** Avisos de la validación (ej. una unidad mencionada que no peleó). */
  warnings: string[];
  /** Cuántas veces se regeneró. Tiene tope para no quemar tokens. */
  generaciones: number;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Presente en el detalle, ausente en el listado. */
  fotos?: CronicaFoto[];
}
