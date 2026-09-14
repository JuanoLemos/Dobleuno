/**
 * FichaCodex — el detalle de una regla o de un item.
 *
 * Reglas e items comparten exactamente la misma ficha: encabezado con tags,
 * cuerpo, original en inglés, fuente e impresión. Lo único que cambia es qué
 * tags van arriba, así que eso entra por props en vez de duplicar la página.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';

interface FichaCodexProps {
  volverA: string;
  volverLabel: string;
  seccion: string;
  nombre: string;
  /** El nombre en inglés, si difiere del visible. */
  original: string | null;
  tags: ReactNode;
  cuerpo: string;
  /** El texto original en inglés, si la ficha se está mostrando traducida. */
  textoOriginal: string | null;
  fuente: { page: string; url: string };
  children?: ReactNode;
}

export function FichaCodex({
  volverA,
  volverLabel,
  seccion,
  nombre,
  original,
  tags,
  cuerpo,
  textoOriginal,
  fuente,
  children,
}: FichaCodexProps) {
  return (
    <article className="codex-narrow py-12">
      <Link to={volverA} className="codex-no-print text-sm codex-muted">
        ← {volverLabel}
      </Link>

      <header className="mb-8 mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {tags}
          <span className="codex-label">§ {seccion}</span>
        </div>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">{nombre}</h1>
        {original && <p className="mt-2 text-sm italic codex-muted">{original}</p>}
        <hr className="codex-divider-accent mt-4" />
      </header>

      {/* whitespace-pre-line: el parser conserva los saltos que separan el
          perfil del arma de su texto. Colapsarlos pega el statline al párrafo. */}
      <div className="codex-block mb-6">
        <p className="whitespace-pre-line text-base leading-relaxed">{cuerpo}</p>
      </div>

      {children}

      {textoOriginal && (
        <details className="codex-no-print mb-8">
          <summary className="cursor-pointer text-sm codex-muted">
            Ver texto original (inglés)
          </summary>
          <p
            className="mt-3 whitespace-pre-line border-l-2 pl-4 text-sm italic leading-relaxed codex-muted"
            style={{ borderColor: 'var(--codex-line)' }}
          >
            {textoOriginal}
          </p>
        </details>
      )}

      <footer className="codex-no-print flex flex-wrap items-center justify-between gap-3 pt-4 text-xs codex-muted">
        <p>
          <span className="codex-label">Fuente</span> ·{' '}
          <a href={fuente.url || fuente.page} rel="noopener noreferrer" target="_blank" className="font-mono">
            {fuente.page}
          </a>
        </p>
        <button type="button" className="codex-cta-ghost" onClick={() => window.print()}>
          <Printer size={12} className="mr-1 inline" />
          Imprimir
        </button>
      </footer>

      {/* Encabezado que solo existe en papel: la hoja sale de contexto. */}
      <div className="codex-print-only mb-4 border-b-2 border-black pb-2">
        <p className="font-serif text-2xl">Dobleuno · {nombre}</p>
        <p className="text-xs">Fuente: {fuente.page}</p>
      </div>
    </article>
  );
}
