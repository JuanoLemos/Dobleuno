import { Link, useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';

/**
 * Páginas legales de Dobleuno.
 * - /legal/privacy  → Política de Privacidad
 * - /legal/terms    → Términos de Servicio
 *
 * El contenido se selecciona por el segmento final del path. El texto
 * está versionado en los archivos i18n (es-AR / en) para mantener
 * consistencia con el resto de la UI.
 */
type LegalKind = 'privacy' | 'terms';

interface SectionDef {
  titleId: string;
  bodyId: string;
}

const PRIVACY_SECTIONS: SectionDef[] = [
  { titleId: 'legal.privacy.s1', bodyId: 'legal.privacy.s1.body' },
  { titleId: 'legal.privacy.s2', bodyId: 'legal.privacy.s2.body' },
  { titleId: 'legal.privacy.s3', bodyId: 'legal.privacy.s3.body' },
  { titleId: 'legal.privacy.s4', bodyId: 'legal.privacy.s4.body' },
  { titleId: 'legal.privacy.s5', bodyId: 'legal.privacy.s5.body' },
  { titleId: 'legal.privacy.s6', bodyId: 'legal.privacy.s6.body' },
];

const TERMS_SECTIONS: SectionDef[] = [
  { titleId: 'legal.terms.s1', bodyId: 'legal.terms.s1.body' },
  { titleId: 'legal.terms.s2', bodyId: 'legal.terms.s2.body' },
  { titleId: 'legal.terms.s3', bodyId: 'legal.terms.s3.body' },
  { titleId: 'legal.terms.s4', bodyId: 'legal.terms.s4.body' },
  { titleId: 'legal.terms.s5', bodyId: 'legal.terms.s5.body' },
  { titleId: 'legal.terms.s6', bodyId: 'legal.terms.s6.body' },
  { titleId: 'legal.terms.s7', bodyId: 'legal.terms.s7.body' },
];

export function Legal() {
  const { kind } = useParams<{ kind: string }>();
  const { formatMessage } = useIntl();

  const normalized: LegalKind | null =
    kind === 'privacy' || kind === 'terms' ? kind : null;

  if (!normalized) {
    return (
      <div className="py-8 text-center text-parchment-300">
        <p>404 — sección legal no encontrada.</p>
        <Link to="/listas" className="text-blood-400 underline-offset-4 hover:underline">
          <FormattedMessage id="legal.back" />
        </Link>
      </div>
    );
  }

  const sections = normalized === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const titleId = normalized === 'privacy' ? 'legal.privacy.title' : 'legal.terms.title';

  return (
    <article className="mx-auto max-w-2xl py-4 text-parchment-100">
      <Link
        to="/listas"
        className="mb-3 inline-block text-sm text-bronze-400 underline-offset-4 hover:underline"
      >
        <FormattedMessage id="legal.back" />
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-bronze-300">
        <FormattedMessage id={titleId} />
      </h1>
      <p className="mb-6 text-xs italic text-parchment-400">
        <FormattedMessage id="legal.lastUpdated" />
      </p>

      <div className="space-y-5 text-sm leading-relaxed">
        {sections.map((s) => (
          <section key={s.titleId}>
            <h2 className="mb-1 font-serif text-base text-bronze-400">
              <FormattedMessage id={s.titleId} />
            </h2>
            <p className="text-parchment-200">{formatMessage({ id: s.bodyId })}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
