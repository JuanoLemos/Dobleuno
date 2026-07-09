/**
 * Ola 7.1 — Script para promover admins automáticamente al boot.
 *
 * Lee ADMIN_EMAILS del .env (comma-separated) y marca is_admin=true
 * para esos users en la BD. Idempotente: si ya están promovidos, no hace nada.
 *
 * Uso:
 *   tsx src/scripts/promote-admin.ts
 *
 * Se ejecuta automáticamente al boot del server (ver index.ts → ensureAdmins()).
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { user } from '../db/schema/users.js';
import { env } from '../env.js';
import { log } from '../lib/logger.js';

export async function ensureAdmins(): Promise<{ promoted: string[]; skipped: string[] }> {
  const raw = env.ADMIN_EMAILS.trim();
  if (!raw) {
    log.debug('No ADMIN_EMAILS configured; skipping admin promotion');
    return { promoted: [], skipped: [] };
  }

  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    return { promoted: [], skipped: [] };
  }

  const promoted: string[] = [];
  const skipped: string[] = [];

  for (const email of emails) {
    try {
      const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
      if (existing.length === 0) {
        log.warn(`ADMIN_EMAILS contains '${email}' but no user with that email exists yet`);
        skipped.push(email);
        continue;
      }
      const u = existing[0];
      if (u?.isAdmin) {
        skipped.push(email);
        continue;
      }
      await db.update(user).set({ isAdmin: true, updatedAt: new Date() }).where(eq(user.id, u!.id));
      promoted.push(email);
    } catch (err) {
      log.error(`Failed to promote ${email}`, { error: (err as Error).message });
      skipped.push(email);
    }
  }

  if (promoted.length > 0) {
    log.info(`Promoted ${promoted.length} admin(s)`, { emails: promoted });
  }
  return { promoted, skipped };
}

// CLI entrypoint
const isMain = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain) {
  ensureAdmins()
    .then((r) => {
      console.log(`✓ Promoted: ${r.promoted.join(', ') || '(none)'}`);
      console.log(`⏭ Skipped: ${r.skipped.join(', ') || '(none)'}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('promote-admin failed:', err);
      process.exit(1);
    });
}
