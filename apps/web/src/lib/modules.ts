import type { LucideIcon } from 'lucide-react';
import { BookOpen, ScrollText, CalendarDays, Images } from 'lucide-react';

/**
 * Registro central de módulos del shell (Ola 8 — ADR-007).
 *
 * Cada módulo tiene:
 *   id       — string único (slug).
 *   label    — texto en español rioplatense.
 *   route    — ruta de React Router.
 *   icon     — componente de lucide-react.
 *   requiresAuth — si true, muestra lock-screen al usuario no logueado.
 *
 * Solo listamos módulos IMPLEMENTADOS.
 */

export type ModuleId = 'codex' | 'listas' | 'mesas' | 'cronicas';

export interface ModuleDef {
  id: ModuleId;
  label: string;
  route: string;
  icon: LucideIcon;
  /** Si true, el shell muestra lock-screen al usuario no logueado. */
  requiresAuth: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'codex',
    label: 'Codex',
    route: '/reglas',
    icon: BookOpen,
    requiresAuth: false,
  },
  {
    id: 'listas',
    label: 'Ejércitos',
    route: '/listas',
    icon: ScrollText,
    requiresAuth: true,
  },
  {
    id: 'mesas',
    label: 'Mesas',
    route: '/mesas',
    icon: CalendarDays,
    requiresAuth: true,
  },
  {
    id: 'cronicas',
    label: 'Crónicas',
    route: '/cronicas',
    icon: Images,
    requiresAuth: true,
  },
];

export function getModule(id: ModuleId): ModuleDef {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown module: ${id}`);
  return m;
}