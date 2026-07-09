export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  language: 'es-AR' | 'en';
  theme: 'dark' | 'light' | 'system';
  faction: 'empire' | 'bretonnia' | null;
  notificationsEnabled: boolean;
}
