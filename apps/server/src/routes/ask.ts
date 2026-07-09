/**
 * Server: endpoint /api/ask — Rules oracle RAG.
 * Ola 5.
 *
 * POST /api/ask
 * Body: { question: string, faction?: 'empire'|'bretonnia', limit?: number }
 * Respuesta: { answer: string, citations: Citation[], chunksUsed, provider, fallback }
 */
import { Router } from 'express';
import { z } from 'zod';
import { ask, type AskInput } from '../lib/rag.js';
import { log } from '../lib/logger.js';

export const askRouter: Router = Router();

const AskSchema = z.object({
  question: z.string().min(3).max(500),
  faction: z.enum(['empire', 'bretonnia']).optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

askRouter.post('/', async (req, res) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  try {
    const input: AskInput = parsed.data;
    const result = await ask(input);
    res.json(result);
  } catch (err) {
    log.error('Ask pipeline failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to process question', detail: (err as Error).message });
  }
});