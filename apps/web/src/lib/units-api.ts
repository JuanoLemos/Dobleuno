/**
 * API client para unidades del catálogo, adaptado al list builder.
 *
 * ── Por qué hay un adaptador acá ─────────────────────────────────────────
 *
 * El list builder habla `KBUnit`: dos facciones, cinco categorías de lista
 * (lord/hero/core/special/rare), stats numéricos, armas como array. Ese tipo se
 * escribió en la Ola 1 antes de ver los datos, y la única razón por la que
 * "funcionaba" es que /api/units caía a 9 unidades hardcodeadas.
 *
 * El corpus real (Ola 11) tiene 31 ejércitos, statlines con "-", "(+1)" y
 * "2D6", y en `unitCategory` trae el TIPO DE TROPA (Infantry, Cavalry,
 * Character, Monster…), no la categoría de lista de ejército. Core/Special/Rare
 * no está en el corpus: el sitio no lo publica.
 *
 * El mapeo vive acá, explícito y en un solo lugar, en vez de fingir en la base
 * una taxonomía que los datos no tienen. Sus límites están anotados abajo.
 */
import { api } from './api.js';
import type { KBUnit, FactionId } from '@dobleuno/shared';

/** Una fila de la tabla `units`, tal como la devuelve la API. */
export interface UnidadDelCatalogo {
  id: string;
  slug: string;
  name: string;
  nameSingular: string;
  army: string;
  associations: string[];
  /** Tipo de tropa: 'Infantry', 'Cavalry', 'Character', 'Monster', … */
  unitCategory: string;
  troopTypes: string[];
  profile: Array<Record<string, string>>;
  baseSize: string;
  unitSize: string;
  cost: number | null;
  costOverride: string;
  armourValue: string;
  equipment: string;
  specialRules: string;
  options: string;
  sourcePage: string;
  sourceUrl: string;
}

interface RespuestaUnidades {
  total: number;
  page: number;
  limit: number;
  count: number;
  units: UnidadDelCatalogo[];
}

/**
 * Las facciones que el list builder soporta, a slug de ejército del corpus.
 *
 * Son dos porque `FactionId` son dos. El corpus trae 31 ejércitos: abrir el
 * builder al resto es una ola propia, no un cambio de este mapa.
 */
const EJERCITO_POR_FACCION: Record<FactionId, string> = {
  empire: 'empire-of-man',
  bretonnia: 'kingdom-of-bretonnia',
};

/**
 * Tipo de tropa → categoría de lista.
 *
 * Aproximación conocida: el corpus no publica Core/Special/Rare, así que todo
 * lo que no es personaje cae en 'core'. La consecuencia es que el validador de
 * composición no puede verificar los topes de Special y Rare. Es preferible a
 * inventar una categoría por unidad.
 */
function categoriaDeLista(unitCategory: string): KBUnit['category'] {
  return unitCategory === 'Character' || unitCategory === 'Named Character' ? 'hero' : 'core';
}

/** "10+" → 10 · "1" → 1 · "" → 1. */
function tamanoMinimo(unitSize: string): number {
  const n = Number.parseInt(unitSize, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Los stats vienen como string porque el sitio usa "-", "(+1)" y "2D6". */
function numero(v: string | undefined): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Adapta una fila del corpus al tipo que consume el list builder.
 *
 * Lo que se pierde en el camino: los perfiles extra (montura), el desglose de
 * armas (el corpus trae `equipment` como texto), y las opciones con su costo
 * (también texto libre). Se conservan como reglas y equipo legibles.
 */
export function aKBUnit(u: UnidadDelCatalogo, faction: FactionId): KBUnit {
  const perfil = u.profile[0] ?? {};
  const porModelo = tamanoMinimo(u.unitSize) > 1;

  return {
    id: u.id,
    faction,
    category: categoriaDeLista(u.unitCategory),
    name: u.name,
    stats: {
      M: numero(perfil.M),
      WS: numero(perfil.WS),
      BS: numero(perfil.BS),
      S: numero(perfil.S),
      T: numero(perfil.T),
      W: numero(perfil.W),
      I: numero(perfil.I),
      A: numero(perfil.A),
      Ld: numero(perfil.Ld),
      Sv: u.armourValue || '-',
    },
    weapons: [],
    specialRules: u.specialRules
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean),
    // El corpus da un solo número. Si la unidad viene de a varios modelos es
    // por modelo; si es una sola miniatura, es fijo.
    pointsPerModel: porModelo ? (u.cost ?? 0) : undefined,
    pointsFixed: porModelo ? undefined : (u.cost ?? 0),
    minSize: tamanoMinimo(u.unitSize),
    commandGroup: {},
    options: [],
    source: {
      page: u.sourcePage,
      url: u.sourceUrl,
      lastVerified: '',
    },
  };
}

export const unitsApi = {
  /**
   * Trae el catálogo de una facción.
   *
   * `limit: 100` es el tope de la API. Alcanza: el ejército más grande del
   * corpus tiene 42 entradas.
   */
  async list(faction: FactionId): Promise<{ units: KBUnit[] }> {
    const res = await api<RespuestaUnidades>('/api/units', {
      query: { army: EJERCITO_POR_FACCION[faction], limit: 100 },
    });
    return { units: res.units.map((u) => aKBUnit(u, faction)) };
  },

  async get(id: string, faction: FactionId): Promise<KBUnit> {
    return aKBUnit(await api<UnidadDelCatalogo>(`/api/units/${id}`), faction);
  },
};
