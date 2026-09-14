/**
 * CodexLayout — la piel del Codex, con scope por ruta.
 *
 * Pone `data-skin="codex"` en el body al montar y lo saca al desmontar. Es
 * deliberado que el atributo viva en el body y no en `:root`: el resto de la
 * app es dark forge y no se tiene que mover cuando el usuario entra al Codex y
 * vuelve a /listas. Todas las reglas de codex.css cuelgan de ese atributo.
 */
import { useEffect, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { Sigil } from '../Sigil.js';
import { MetaCodex } from './MetaCodex.js';
import '../../styles/codex.css';

interface CodexLayoutProps {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}

const SECCIONES = [
  { to: '/reglas', label: 'Reglas' },
  { to: '/items', label: 'Items' },
  { to: '/sobre', label: 'Sobre' },
];

export function CodexLayout({ titulo, descripcion, children }: CodexLayoutProps) {
  useEffect(() => {
    const previo = document.body.dataset.skin;
    document.body.dataset.skin = 'codex';
    return () => {
      if (previo) document.body.dataset.skin = previo;
      else delete document.body.dataset.skin;
    };
  }, []);

  return (
    <div className="codex-surface">
      <MetaCodex titulo={titulo} descripcion={descripcion} />
      <header className="codex-no-print border-b" style={{ borderColor: 'var(--codex-line)' }}>
        <div className="codex-wide flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2" aria-label="Dobleuno — inicio">
            <Sigil size="mini" />
            <span className="font-serif text-lg">Dobleuno</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm uppercase tracking-wide">
            {SECCIONES.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                className={({ isActive }) => (isActive ? 'codex-accent' : 'codex-muted')}
              >
                {s.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer
        className="codex-no-print mt-16 border-t py-8"
        style={{ borderColor: 'var(--codex-line)' }}
      >
        <div className="codex-wide text-xs codex-muted">
          <p>
            Contenido derivado de{' '}
            <a href="https://tow.whfb.app" rel="noopener noreferrer" target="_blank">
              tow.whfb.app
            </a>
            . Dobleuno no está afiliado ni respaldado por Games Workshop. Warhammer: The Old World
            es marca registrada de Games Workshop Limited.
          </p>
        </div>
      </footer>
    </div>
  );
}
