/**
 * Cliente better-auth para el frontend.
 * Maneja signup, signin, signout, session, etc.
 * Documentación: https://www.better-auth.com/docs
 */
import { createAuthClient } from 'better-auth/react';
import { env } from './env.js';

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
});

export const { useSession, signIn, signUp, signOut } = authClient;
