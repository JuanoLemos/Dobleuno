/**
 * API client para unidades (catálogo de la KB).
 * Usado por el list builder para abrir el unit picker.
 */
import { api } from './api.js';
import type { KBUnit } from '@dobleuno/shared';

export const unitsApi = {
  async list(faction?: 'empire' | 'bretonnia'): Promise<{ units: KBUnit[]; source: string }> {
    return api('/api/units', { query: { faction } });
  },

  async get(id: string): Promise<KBUnit> {
    return api(`/api/units/${id}`);
  },
};
