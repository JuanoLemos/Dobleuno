/**
 * Server: CRUD de batallas (game state).
 * Ola 4.
 */

import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db, isDbHealthy } from '../db/client.js';
import { lists } from '../db/schema/lists.js';
import { battles } from '../db/schema/battles.js';
import { log } from '../lib/logger.js';
import type { BattleState } from '@dobleuno/shared';

export const battlesRouter: Router = Router();

const PLACEHOLDER_USER_ID = 'dev-user-1';

const GamePhaseEnum = z.enum(['start', 'movement', 'magic', 'shooting', 'combat', 'end']);

const BattleUnitSchema = z.object({
  id: z.string(),
  ref: z.string(),
  name: z.string(),
  faction: z.enum(['player', 'opponent']),
  modelsCurrent: z.number().int().nonnegative(),
  modelsStart: z.number().int().nonnegative(),
  ranks: z.number().int().nonnegative().default(1),
  status: z.enum([
    'idle',
    'moving',
    'charging',
    'engaged',
    'fleeing',
    'pursuing',
    'reforming',
    'rallied',
    'destroyed',
  ]),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  woundsTaken: z.number().int().nonnegative().default(0),
  activeEffects: z.array(z.string()).default([]),
});

const BattleStateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  scenario: z.string().default('Pitched Battle'),
  playerListId: z.string().optional(),
  opponentListId: z.string().optional(),
  opponentArmySummary: z.string().optional(),
  terrain: z.array(z.string()).default([]),
  turn: z.number().int().nonnegative().default(0),
  phase: GamePhaseEnum.default('start'),
  activePlayer: z.enum(['player', 'opponent']).default('player'),
  units: z.array(BattleUnitSchema).default([]),
  log: z
    .array(
      z.object({
        id: z.string(),
        turn: z.number().int().nonnegative(),
        phase: GamePhaseEnum,
        timestamp: z.string(),
        text: z.string(),
        category: z.enum([
          'movement',
          'magic',
          'shooting',
          'combat',
          'psychology',
          'command',
          'system',
        ]),
      }),
    )
    .default([]),
  status: z.enum(['setup', 'deployment', 'in-progress', 'finished']).default('setup'),
  winner: z.enum(['player', 'opponent', 'draw']).optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  updatedAt: z.string(),
});

const CreateBattleSchema = z.object({
  name: z.string().min(1).max(100),
  scenario: z.string().optional(),
  playerListId: z.string().min(1), // required: UI siempre pide una lista
  opponentListId: z.string().optional(),
  opponentArmySummary: z.string().optional(),
  terrain: z.array(z.string()).optional(),
});

battlesRouter.get('/', async (_req, res) => {
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const rows = await db
      .select({
        id: battles.id,
        name: battles.name,
        status: battles.status,
        updatedAt: battles.updatedAt,
        data: battles.data,
      })
      .from(battles)
      .where(eq(battles.userId, PLACEHOLDER_USER_ID))
      .orderBy(desc(battles.updatedAt))
      .limit(50);
    // Flatten: caller wants {id, name, status, turn, phase, updatedAt}
    const summaries = rows.map((r) => {
      const data = r.data;
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        turn: data.turn,
        phase: data.phase,
        updatedAt: r.updatedAt,
      };
    });
    res.json({ count: summaries.length, battles: summaries });
  } catch (err) {
    log.error('Battles list failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list battles' });
  }
});

battlesRouter.post('/', async (req, res) => {
  // Validar body primero — si es inválido, devolver 400 sin tocar DB
  const parsed = CreateBattleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Si hay listas, hidratar units
  let units: BattleState['units'] = [];
  if (parsed.data.playerListId) {
    const playerList = await loadListUnits(parsed.data.playerListId, 'player');
    units = units.concat(playerList);
  }
  if (parsed.data.opponentListId) {
    const oppList = await loadListUnits(parsed.data.opponentListId, 'opponent');
    units = units.concat(oppList);
  } else if (parsed.data.opponentArmySummary) {
    // No opponent list: just store the summary text
  }

  const battle: BattleState = {
    id,
    userId: PLACEHOLDER_USER_ID,
    name: parsed.data.name,
    scenario: parsed.data.scenario ?? 'Pitched Battle',
    playerListId: parsed.data.playerListId,
    opponentListId: parsed.data.opponentListId,
    opponentArmySummary: parsed.data.opponentArmySummary,
    terrain: parsed.data.terrain ?? [],
    turn: 0,
    phase: 'start',
    activePlayer: 'player',
    units,
    log: [
      {
        id: crypto.randomUUID(),
        turn: 0,
        phase: 'start',
        timestamp: now,
        text: `Batalla "${parsed.data.name}" creada.`,
        category: 'system',
      },
    ],
    status: units.length > 0 ? 'in-progress' : 'setup',
    startedAt: now,
    updatedAt: now,
  };

  try {
    const [row] = await db
      .insert(battles)
      .values({
        id: battle.id,
        userId: PLACEHOLDER_USER_ID,
        name: battle.name,
        status: battle.status,
        data: battle,
      })
      .returning();
    res.status(201).json({ battle: row });
  } catch (err) {
    log.error('Battle create failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create battle' });
  }
});

battlesRouter.get('/:id', async (req, res) => {
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const [row] = await db
      .select()
      .from(battles)
      .where(and(eq(battles.id, req.params.id), eq(battles.userId, PLACEHOLDER_USER_ID)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }
    res.json(row);
  } catch (err) {
    log.error('Battle fetch failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch battle' });
  }
});

battlesRouter.patch('/:id', async (req, res) => {
  // Validar body primero
  const parsed = BattleStateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad request', details: parsed.error.flatten() });
    return;
  }
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    const [current] = await db
      .select()
      .from(battles)
      .where(and(eq(battles.id, req.params.id), eq(battles.userId, PLACEHOLDER_USER_ID)))
      .limit(1);
    if (!current) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }
    const merged: BattleState = {
      ...current.data,
      ...parsed.data,
      id: current.id,
      userId: current.userId,
      updatedAt: new Date().toISOString(),
    };
    const [row] = await db
      .update(battles)
      .set({
        name: merged.name,
        status: merged.status,
        data: merged,
        updatedAt: new Date(merged.updatedAt),
      })
      .where(eq(battles.id, req.params.id))
      .returning();
    res.json({ battle: row });
  } catch (err) {
    log.error('Battle update failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to update battle' });
  }
});

battlesRouter.delete('/:id', async (req, res) => {
  if (!(await isDbHealthy())) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }
  try {
    await db
      .delete(battles)
      .where(and(eq(battles.id, req.params.id), eq(battles.userId, PLACEHOLDER_USER_ID)));
    res.status(204).end();
  } catch (err) {
    log.error('Battle delete failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete battle' });
  }
});

/** Carga los units de una list como battle units. */
async function loadListUnits(
  listId: string,
  faction: 'player' | 'opponent'
): Promise<BattleState['units']> {
  try {
    const [row] = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
    if (!row) return [];
    const list = row.data;
    return list.units.map((u) => ({
      id: `${faction}-${u.id}`,
      ref: u.ref,
      name: u.name,
      faction,
      modelsCurrent: u.models ?? 1,
      modelsStart: u.models ?? 1,
      ranks: 1,
      status: 'idle' as const,
      woundsTaken: 0,
      activeEffects: [],
    }));
  } catch {
    return [];
  }
}
