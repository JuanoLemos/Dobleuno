/**
 * /reglas/:slug — una regla especial.
 *
 * Además del texto muestra las reglas relacionadas que el sitio declara
 * (`related`): en el reglamento, "Impact Hits" manda a "Thunderstomp" y a
 * "Stomp Attacks", y saltar entre ellas es la mitad de consultar una regla.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CodexLayout } from '../components/codex/CodexLayout.js';
import { FichaCodex } from '../components/codex/FichaCodex.js';
import { titulo } from '../components/codex/FacetNav.js';
import { obtenerRegla, nombreVisible, textoVisible, type CodexRule } from '../lib/codex-api.js';

/** La meta description: una línea, sin saltos, cortada en seco. */
function resumen(texto: string): string {
  return `${texto.replace(/\s+/g, ' ').slice(0, 150)}…`;
}

export function CodexRegla() {
  const { slug = '' } = useParams();
  const [regla, setRegla] = useState<CodexRule | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    void obtenerRegla(slug)
      .then((r) => {
        if (!cancelado) setRegla(r);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [slug]);

  if (cargando) {
    return (
      <CodexLayout titulo="Regla" descripcion="Una regla especial de Warhammer: The Old World.">
        <div className="codex-narrow py-12 text-sm codex-muted">Cargando…</div>
      </CodexLayout>
    );
  }

  if (!regla) {
    return (
      <CodexLayout titulo="Regla no encontrada" descripcion="Esa regla no está en el Codex.">
        <div className="codex-narrow py-12">
          <h1 className="font-serif text-3xl">Esa regla no está en el Codex.</h1>
          <p className="mt-2 text-sm codex-muted">
            Puede que el slug haya cambiado en el sitio de origen.
          </p>
          <Link to="/reglas" className="codex-cta-ghost mt-6 inline-block">
            Ver todas las reglas
          </Link>
        </div>
      </CodexLayout>
    );
  }

  const nombre = nombreVisible(regla);

  return (
    <CodexLayout titulo={nombre} descripcion={resumen(textoVisible(regla))}>
      <FichaCodex
        volverA="/reglas"
        volverLabel="Todas las reglas"
        seccion={regla.ruleType ? titulo(regla.ruleType) : 'Regla'}
        nombre={nombre}
        original={nombre !== regla.name ? regla.name : null}
        tags={regla.ruleType ? <span className="codex-tag codex-tag-accent">{titulo(regla.ruleType)}</span> : null}
        cuerpo={textoVisible(regla)}
        textoOriginal={regla.descriptionEs ? regla.description : null}
        fuente={{ page: regla.sourcePage, url: regla.sourceUrl }}
      >
        {regla.related.length > 0 && (
          <section className="codex-no-print mb-8">
            <p className="codex-label mb-2">Reglas relacionadas</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {regla.related.map((r) => (
                <Link key={r} to={`/reglas/${r}`}>
                  {titulo(r)}
                </Link>
              ))}
            </div>
          </section>
        )}
      </FichaCodex>
    </CodexLayout>
  );
}
