/**
 * /items/:slug — un item mágico.
 *
 * Los `itemTypes` son las listas de ejército donde el item está disponible
 * ('empire-of-man-magic-items-type', …). Van como tags porque son ellas las que
 * deciden si entra o no en una lista, más que el `type`.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CodexLayout } from '../components/codex/CodexLayout.js';
import { FichaCodex } from '../components/codex/FichaCodex.js';
import { tituloDeLista } from '../components/codex/FacetNav.js';
import {
  obtenerItem,
  nombreVisible,
  textoVisible,
  type CodexItem as Item,
} from '../lib/codex-api.js';

/** La meta description: una línea, sin saltos, cortada en seco. */
function resumen(texto: string): string {
  return `${texto.replace(/\s+/g, ' ').slice(0, 150)}…`;
}

export function CodexItem() {
  const { slug = '' } = useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    void obtenerItem(slug)
      .then((i) => {
        if (!cancelado) setItem(i);
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
      <CodexLayout titulo="Item mágico" descripcion="Un item mágico de Warhammer: The Old World.">
        <div className="codex-narrow py-12 text-sm codex-muted">Cargando…</div>
      </CodexLayout>
    );
  }

  if (!item) {
    return (
      <CodexLayout titulo="Item no encontrado" descripcion="Ese item no está en el Codex.">
        <div className="codex-narrow py-12">
          <h1 className="font-serif text-3xl">Ese item no está en el Codex.</h1>
          <Link to="/items" className="codex-cta-ghost mt-6 inline-block">
            Ver todos los items
          </Link>
        </div>
      </CodexLayout>
    );
  }

  const nombre = nombreVisible(item);

  return (
    <CodexLayout titulo={nombre} descripcion={resumen(textoVisible(item))}>
      <FichaCodex
        volverA="/items"
        volverLabel="Todos los items"
        seccion="Item mágico"
        nombre={nombre}
        original={nombre !== item.name ? item.name : null}
        tags={
          <>
            {item.type && <span className="codex-tag codex-tag-accent">{item.type}</span>}
            {item.cost > 0 && (
              <span className="font-mono text-sm codex-accent">{item.cost} pts</span>
            )}
          </>
        }
        cuerpo={textoVisible(item)}
        textoOriginal={item.descriptionEs ? item.description : null}
        fuente={{ page: item.sourcePage, url: item.sourceUrl }}
      >
        {item.itemTypes.length > 0 && (
          <section className="codex-no-print mb-8">
            <p className="codex-label mb-2">Disponible en las listas de</p>
            <div className="flex flex-wrap gap-2">
              {item.itemTypes.map((t) => (
                <Link key={t} to={`/items?fam=${encodeURIComponent(t)}`} className="codex-tag">
                  {tituloDeLista(t)}
                </Link>
              ))}
            </div>
          </section>
        )}
      </FichaCodex>
    </CodexLayout>
  );
}
