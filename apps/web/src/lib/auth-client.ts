/**
 * Cliente better-auth para el frontend.
 * Maneja signup, signin, signout, session, etc.
 * Documentación: https://www.better-auth.com/docs
 */
import { createAuthClient } from 'better-auth/react';
import { apiBase } from './env.js';

export const authClient = createAuthClient({
  baseURL: apiBase(),
});

export const { useSession, signIn, signUp, signOut } = authClient;
