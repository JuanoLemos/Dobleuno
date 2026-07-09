/**
 * Cliente: API para el oracle RAG /api/ask.
 * Ola 5.
 */
import { api } from './api.js';
import type { Citation } from '@dobleuno/shared';

export interface AskResponse {
  answer: string;
  citations: Citation[];
  chunksUsed: number;
  provider: string;
  fallback: 'pgvector' | 'text-search' | 'none';
}

export const askApi = {
  async question(input: {
    question: string;
    faction?: 'empire' | 'bretonnia';
    limit?: number;
  }): Promise<AskResponse> {
    return api('/api/ask', { method: 'POST', body: input });
  },
};