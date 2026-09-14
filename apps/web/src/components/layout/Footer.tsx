import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';

/**
 * Footer visible en todas las rutas autenticadas (AppShell).
 * - Disclaimer de no-afiliación con Games Workshop (trademark defense)
 * - Atribución a tow.whfb.app
 * - Links a /legal/privacy y /legal/terms
 * - Declaración no-comercial
 */
export function Footer() {
  return (
    <footer className="mt-8 border-t border-forge-3 bg-forge-1/60 px-4 py-4 pb-20 text-[11px] leading-relaxed text-parchment-400">
      <p className="mb-2">
        <FormattedMessage id="footer.disclaimer" />
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          to="/legal/privacy"
          className="text-bronze-400 underline-offset-4 hover:underline"
        >
          <FormattedMessage id="footer.privacy" />
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          to="/legal/terms"
          className="text-bronze-400 underline-offset-4 hover:underline"
        >
          <FormattedMessage id="footer.terms" />
        </Link>
        <span aria-hidden="true">·</span>
        <span>CC BY 4.0</span>
      </p>
    </footer>
  );
}
