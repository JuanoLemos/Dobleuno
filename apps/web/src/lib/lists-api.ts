/**
 * API client para listas.
 * Envuelve los endpoints /api/lists del server.
 */
import { api } from './api.js';
import type { List } from '@dobleuno/shared';

export const listsApi = {
  async list(): Promise<{ lists: Array<{ id: string; name: string; faction: string; totalPoints: number; updatedAt: string }> }> {
    return api('/api/lists');
  },

  async get(id: string): Promise<{ list: { id: string; data: List } }> {
    return api(`/api/lists/${id}`);
  },

  async create(list: Omit<List, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ list: { id: string }; validation: { valid: boolean; errors: unknown[] } }> {
    return api('/api/lists', { method: 'POST', body: list });
  },

  async update(id: string, list: Partial<List>): Promise<{ list: unknown; validation: { valid: boolean; errors: unknown[] } }> {
    return api(`/api/lists/${id}`, { method: 'PATCH', body: list });
  },

  async remove(id: string): Promise<void> {
    await api(`/api/lists/${id}`, { method: 'DELETE' });
  },
};
