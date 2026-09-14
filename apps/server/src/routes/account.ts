/**
 * Account management — Ola 8 (compliance: Ley 25.326 / GDPR art. 17 + 20).
 *
 * DELETE /api/account     → borrado completo del user + cascade (sessions, accounts, lists, battles).
 * GET    /api/me/export   → export de todos los datos personales del user (perfil + lists + battles).
 *
 * Ambos endpoints requieren sesión válida (requireAuth).
 * El export cumple GDPR art. 20 (portabilidad) + Ley 25.326 art. 14 (derecho de acceso).
 * El delete cumple GDPR art. 17 (derecho al olvido) + Ley 25.326 art. 17 (supresión).
 */
import { Router } from 'express';
import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { user, session, account as accountTable } from '../db/schema/users.js';
import { lists } from '../db/schema/lists.js';
import { battles } from '../db/schema/battles.js';
import { log } from '../lib/logger.js';

export const accountRouter: Router = Router();

// DELETE /api/account — borra el user logueado + todo lo asociado.
// Cascada via FK (onDelete: 'cascade') se encarga de session, account, lists, battles.
accountRouter.delete('/account', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Borrado explícito en orden para que el audit log sea claro,
    // aunque la FK cascade ya haría todo al borrar el user.
    // 1) Datos del dominio (lists, battles)
    await db.delete(lists).where(eq(lists.userId, userId));
    await db.delete(battles).where(eq(battles.userId, userId));
    // 2) Auth tables
    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(accountTable).where(eq(accountTable.userId, userId));
    // 3) El user en sí
    const [deleted] = await db
      .delete(user)
      .where(eq(user.id, userId))
      .returning({ id: user.id, email: user.email });

    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    log.info('Account deleted', { userId, email: deleted.email });
    res.status(200).json({
      ok: true,
      message: 'Cuenta y datos asociados eliminados.',
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    log.error('Account delete failed', {
      userId,
      error: (err as Error).message,
    });
    res.status(500).json({
      error: 'Failed to delete account',
      message: (err as Error).message,
    });
  }
});

// GET /api/me/export — exporta todos los datos personales del user logueado.
// Formato: JSON con perfil, listas y batallas. Pensado para descargar.
accountRouter.get('/me/export', requireAuth, async (req, res) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const [profile] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userLists = await db
      .select()
      .from(lists)
      .where(eq(lists.userId, userId));

    const userBattles = await db
      .select()
      .from(battles)
      .where(eq(battles.userId, userId));

    // Headers para que el browser descargue como archivo
    const filename = `dobleuno-export-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json({
      exportVersion: 1,
      generatedAt: new Date().toISOString(),
      profile: {
        ...profile,
        // No exportamos campos sensibles como password hash
      },
      lists: userLists,
      battles: userBattles,
      summary: {
        listCount: userLists.length,
        battleCount: userBattles.length,
      },
    });
  } catch (err) {
    log.error('Account export failed', {
      userId,
      error: (err as Error).message,
    });
    res.status(500).json({
      error: 'Failed to export account',
      message: (err as Error).message,
    });
  }
});
