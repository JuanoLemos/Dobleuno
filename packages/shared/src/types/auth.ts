import type { User } from './user.js';

export interface AuthSession {
  user: User;
  session: {
    id: string;
    token: string;
    expiresAt: string;
    createdAt: string;
  };
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}
