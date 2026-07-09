import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases con clsx + tailwind-merge.
 * Patrón de shadcn/ui. Útil para variant props + clases condicionales.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
