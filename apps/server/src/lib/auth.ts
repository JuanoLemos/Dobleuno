/**
 * Setup de better-auth con Drizzle adapter.
 * Email/pass por default, con verification flow.
 * Ola 1: configurado pero email verification se loguea en consola (no SMTP real).
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client.js';
import { env } from '../env.js';
import * as schema from '../db/schema/users.js';

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
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: false, // MVP: lo desactivamos, lo activamos cuando haya SMTP
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // 1 día
  },
  advanced: {
    cookiePrefix: 'dobleuno',
  },
  logger: {
    level: env.LOG_LEVEL,
  },
});

export type Auth = typeof auth;
