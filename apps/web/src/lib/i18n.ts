/**
 * i18n setup con react-intl.
 * Ola 1: solo es-AR, con fallback a en.
 */
import { createIntl, type IntlShape } from 'react-intl';
import esAR from '../i18n/es-AR.json';
import en from '../i18n/en.json';

export const locales = {
  'es-AR': esAR,
  en: en,
} as const;

export type Locale = keyof typeof locales;

export function getIntl(locale: Locale = 'es-AR'): IntlShape {
  return createIntl({
    locale,
    messages: locales[locale],
    defaultLocale: 'es-AR',
    fallbackOnEmptyString: true,
  });
}
