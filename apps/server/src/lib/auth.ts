/**
 * Setup de better-auth con Drizzle adapter.
 * Email/pass por default, con verification flow.
 * Ola 1: configurado pero email verification se loguea en consola (no SMTP real).
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { env } from '../env.js';
import * as schema from '../db/schema/users.js';
import { user as userTable } from '../db/schema/users.js';
import { log } from './logger.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  /**
   * Ola 8 — Trustar el origen del dev server de Vite (5173).
   * Sin esto, better-auth rechaza con 403 INVALID_ORIGIN las requests
   * cross-origin desde el cliente React. En prod, agregar el dominio real.
   *
   * IMPORTANTE: better-auth v1.6+ lee `trustedOrigins` desde el root de la
   * config, NO desde `advanced.trustedOrigins`. La doc está en
   * `dist/context/helpers.mjs:getTrustedOrigins()` — ver también la
   * nota de Ola 8 sobre por qué no andaba.
   */
  /**
   * Los orígenes de dev estaban hardcodeados, incluido el del portal Astro
   * que se retiró en la Ola 11. En producción eso dejaba dos localhost
   * confiables para siempre.
   *
   * Ahora sale de la config: el origen público (BETTER_AUTH_URL) siempre, más
   * el dev server de Vite sólo fuera de producción.
   */
  trustedOrigins: [
    new URL(env.BETTER_AUTH_URL).origin,
    ...(env.CORS_ORIGIN ? [new URL(env.CORS_ORIGIN).origin] : []),
    ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: false, // MVP: lo desactivamos, lo activamos cuando haya SMTP
  },
  user: {
    // Ola 7.1 — exponer is_admin en la sesión que retorna /api/auth/get-session.
    additionalFields: {
      isAdmin: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false, // no se puede setear desde signup; solo el server lo marca
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // 1 día
  },
  /**
   * Ola 10 — Auto-promover admins en signup.
   * Si el email del nuevo user está en ADMIN_EMAILS (env), se marca
   * is_admin=true automáticamente al crearse. Sin esto, había que
   * reiniciar el server o correr promote-admin.ts manual después del
   * signup. Ahora es transparente.
   */
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const raw = env.ADMIN_EMAILS.trim();
          if (!raw) return;
          const adminEmails = raw
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          if (!adminEmails.includes(createdUser.email.toLowerCase())) return;
          if (createdUser.isAdmin) return;
          try {
            await db
              .update(userTable)
              .set({ isAdmin: true, updatedAt: new Date() })
              .where(eq(userTable.id, createdUser.id));
            log.info(`Auto-promoted ${createdUser.email} to admin (ADMIN_EMAILS match)`);
          } catch (err) {
            log.error(`Auto-promote failed for ${createdUser.email}`, {
              error: (err as Error).message,
            });
          }
        },
      },
    },
  },
  advanced: {
    cookiePrefix: 'dobleuno',
  },
  logger: {
    level: env.LOG_LEVEL,
  },
});

export type Auth = typeof auth;
