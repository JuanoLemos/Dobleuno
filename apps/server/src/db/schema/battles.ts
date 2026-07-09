/**
 * Schema de batallas en curso.
 * Tabla separada de lists para mantener el dominio limpio.
 * El campo `data` guarda el BattleState completo (state machine + log).
 */

import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from './users.js';
import type { BattleState } from '@dobleuno/shared';

export const battles = pgTable(
  'battles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: text('status').notNull().default('setup'), // 'setup' | 'deployment' | 'in-progress' | 'finished'
    data: jsonb('data').$type<BattleState>().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('battles_user_idx').on(t.userId),
    statusIdx: index('battles_status_idx').on(t.status),
  }),
);

export type BattleRow = typeof battles.$inferSelect;
export type NewBattleRow = typeof battles.$inferInsert;