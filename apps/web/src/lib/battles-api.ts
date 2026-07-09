/**
 * Cliente: API para batallas.
 * Ola 4.
 */
import { api } from './api.js';
import type { BattleState } from '@dobleuno/shared';

export const battlesApi = {
  async list(): Promise<{ battles: Array<{ id: string; name: string; status: string; turn: number; phase: string }> }> {
    return api('/api/battles');
  },

  async get(id: string): Promise<{ id: string; data: BattleState }> {
    return api(`/api/battles/${id}`);
  },

  async create(input: {
    name: string;
    scenario?: string;
    playerListId?: string;
    opponentListId?: string;
    opponentArmySummary?: string;
    terrain?: string[];
  }): Promise<{ battle: { id: string; data: BattleState } }> {
    return api('/api/battles', { method: 'POST', body: input });
  },

  async update(id: string, state: Partial<BattleState>): Promise<{ battle: unknown }> {
    return api(`/api/battles/${id}`, { method: 'PATCH', body: state });
  },

  async remove(id: string): Promise<void> {
    await api(`/api/battles/${id}`, { method: 'DELETE' });
  },
};
