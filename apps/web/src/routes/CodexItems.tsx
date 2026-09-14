/**
 * /items — índice del Codex de items mágicos.
 *
 * Misma mecánica que /reglas (query string como estado, paginado server-side),
 * con la faceta en `type` en vez de la sección del reglamento.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CodexLayout } from '../components/codex/CodexLayout.js';
import { CodexSearchBox } from '../components/codex/CodexSearchBox.js';
import { CodexItemCard } from '../components/codex/CodexItemCard.js';
import { FacetNav, titulo } from '../components/codex/FacetNav.js';
import { Paginador } from '../components/codex/Paginador.js';
import { AvisoDeCache } from '../components/codex/AvisoDeCache.js';
import { useDebounce } from '../lib/use-debounce.js';
import {
  listarItems,
  listarTiposDeItem,
  LIMITE_POR_PAGINA,
  type MotivoDeCache,
  type CodexItem,
  type Faceta,
} from '../lib/codex-api.js';

export function CodexItems() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat');
  const fam = params.get('fam');
  const page = Number.parseInt(params.get('page') ?? '1', 10) || 1;

  const [items, setItems] = useState<CodexItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tipos, setTipos] = useState<Faceta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [motivoCache, setMotivoCache] = useState<MotivoDeCache | undefined>();
  const [error, setError] = useState<string | null>(null);

  const qDebounced = useDebounce(q, 250);

  useEffect(() => {
    void listarTiposDeItem().then(setTipos);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    void listarItems({
      q: qDebounced || undefined,
      filtro: cat ?? undefined,
      familia: fam ?? undefined,
      page,
    })
      .then((pagina) => {
        if (cancelado) return;
        setItems(pagina.entradas);
        setTotal(pagina.total);
        setMotivoCache(pagina.motivo);
      })
      .catch((err: Error) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [qDebounced, cat, fam, page]);

  function actualizar(cambios: Record<string, string | null>): void {
    const siguiente = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === '') siguiente.delete(k);
      else siguiente.set(k, v);
    }
    if (!('page' in cambios)) siguiente.delete('page');
    setParams(siguiente, { replace: true });
  }

  const totalTipos = tipos.reduce((n, t) => n + t.count, 0);

  return (
    <CodexLayout
      titulo="Items mágicos"
      descripcion="Los items mágicos de Warhammer: The Old World, con su costo en puntos."
    >
      <section className="codex-wide py-12">
        <div className="mb-10">
          <p className="codex-label mb-3">§ Items mágicos · Codex</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              {totalTipos > 0 ? `${totalTipos} items mágicos` : 'Items mágicos'}.
            </h1>
            <CodexSearchBox
              value={q}
              onChange={(v) => actualizar({ q: v })}
              placeholder="Buscar item (espada, armadura, talismán…)"
              label="Buscar items mágicos"
            />
          </div>
          <hr className="codex-divider-accent mt-6" />
        </div>

        {tipos.length > 0 && (
          <>
            <FacetNav
              facetas={tipos}
              seleccion={cat}
              onSelect={(v) => actualizar({ cat: v, fam: null })}
              etiquetaTodos="Todos"
              total={totalTipos}
            />
            <hr className="codex-divider my-6" />
          </>
        )}

        <AvisoDeCache motivo={motivoCache} enCache={items.length} />

        {error && (
          <div className="codex-block">
            <p className="font-serif text-xl codex-accent">No se pudieron traer los items.</p>
            <p className="mt-1 text-sm codex-muted">{error}</p>
          </div>
        )}

        {!error && cargando && items.length === 0 && <p className="text-sm codex-muted">Cargando…</p>}

        {!error && !cargando && items.length === 0 && (
          <div className="codex-block">
            <p className="font-serif text-xl codex-accent">
              {q || cat || fam
                ? 'Nada coincide con esa búsqueda.'
                : motivoCache
                  ? 'Todavía no hay items en este dispositivo.'
                  : 'No hay items cargados todavía.'}
            </p>
            <p className="mt-1 text-sm codex-muted">
              {q || cat || fam ? (
                'Probá con otro término o sacá el filtro.'
              ) : motivoCache === 'sin-red' ? (
                'Volvé a entrar con conexión una vez y el Codex queda disponible sin señal.'
              ) : motivoCache === 'server-caido' ? (
                'El servidor no responde. Probá de nuevo en un rato.'
              ) : (
                <>
                  Corré <code className="font-mono">npm run rules:sync</code> y después{' '}
                  <code className="font-mono">npm run kb:seed -w @dobleuno/server</code>.
                </>
              )}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <>
            {(cat ?? fam) && (
              <h2 className="mb-5 font-serif text-2xl">
                {titulo((cat ?? fam) as string)}{' '}
                <span className="font-mono text-xs codex-muted">{total}</span>
              </h2>
            )}
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {items.map((i) => (
                <CodexItemCard key={i.id} item={i} />
              ))}
            </div>
            <Paginador
              page={page}
              limit={LIMITE_POR_PAGINA}
              total={total}
              onChange={(p) => actualizar({ page: String(p) })}
            />
          </>
        )}
      </section>
    </CodexLayout>
  );
}
