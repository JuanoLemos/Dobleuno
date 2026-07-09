/**
 * Schema de listas (army lists) de TOW.
 * Tabla separada para mantener limpio el dominio.
 */

import { pgTable, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from './users.js';
import type { List } from '@dobleuno/shared';

export const lists = pgTable(
  'lists',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    faction: text('faction').notNull(), // 'empire' | 'bretonnia'
    totalPoints: integer('total_points').notNull().default(0),
    data: jsonb('data').$type<List>().notNull(), // JSON serializado
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('lists_user_idx').on(t.userId),
    factionIdx: index('lists_faction_idx').on(t.faction),
  }),
);

export type ListRow = typeof lists.$inferSelect;
export type NewListRow = typeof lists.$inferInsert;
