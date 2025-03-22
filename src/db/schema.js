import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const fingerprints = sqliteTable('fingerprints', {
  id: integer('id').primaryKey(),
  fingerprint: text('fingerprint').notNull(),
  userAgent: text('user_agent').notNull(),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});
