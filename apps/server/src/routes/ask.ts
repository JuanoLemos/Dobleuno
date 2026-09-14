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

/**
 * Presupuesto de la request, por encima del timeout del cliente de DeepSeek.
 *
 * El cliente ya corta a los 45s con 2 reintentos, así que esto es la red de
 * contención: cubre el caso en que el que se cuelga es otro tramo (retrieval,
 * embeddings) y evita que la conexión del usuario quede abierta sin respuesta.
 * Es lo que pasó al verificar el oráculo en la Ola 11: el proveedor aceptaba y
 * no generaba, y del lado del usuario eso se veía como una página que gira.
 */
const PRESUPUESTO_MS = 100_000;

class TiempoAgotado extends Error {}

function presupuesto(): Promise<never> {
  return new Promise((_, rechazar) =>
    setTimeout(() => rechazar(new TiempoAgotado()), PRESUPUESTO_MS).unref(),
  );
}

askRouter.post('/', async (req, res) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }

  try {
    const input: AskInput = parsed.data;
    const result = await Promise.race([ask(input), presupuesto()]);
    res.json(result);
  } catch (err) {
    if (err instanceof TiempoAgotado) {
      log.warn('Ask excedió el presupuesto', { ms: PRESUPUESTO_MS });
      res.status(504).json({
        error: 'El oráculo tardó demasiado',
        detail:
          'El proveedor no respondió a tiempo. No es un problema de tu pregunta: probá de nuevo en un rato.',
      });
      return;
    }
    log.error('Ask pipeline failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to process question', detail: (err as Error).message });
  }
});