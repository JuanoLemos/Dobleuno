/**
 * /reglas — índice del Codex de reglas especiales.
 *
 * El estado vive en la query string (`?q=`, `?cat=`, `?page=`), no en useState:
 * así una búsqueda se puede compartir y el botón atrás del browser hace lo que
 * el usuario espera. La home del portal linkeaba a `/reglas?cat=<tag>` desde la
 * Ola 6 y esa página nunca leyó los search params; ahora sí funciona.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import { CodexLayout } from '../components/codex/CodexLayout.js';
import { CodexSearchBox } from '../components/codex/CodexSearchBox.js';
import { CodexRuleCard } from '../components/codex/CodexRuleCard.js';
import { FacetNav, titulo } from '../components/codex/FacetNav.js';
import { Paginador } from '../components/codex/Paginador.js';
import { AvisoDeCache } from '../components/codex/AvisoDeCache.js';
import { OraclePanel } from '../components/reglas/OraclePanel.js';
import { useDebounce } from '../lib/use-debounce.js';
import {
  listarReglas,
  listarSecciones,
  LIMITE_POR_PAGINA,
  type MotivoDeCache,
  type CodexRule,
  type Faceta,
} from '../lib/codex-api.js';

export function CodexReglas() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat');
  const page = Number.parseInt(params.get('page') ?? '1', 10) || 1;

  const [reglas, setReglas] = useState<CodexRule[]>([]);
  const [total, setTotal] = useState(0);
  const [secciones, setSecciones] = useState<Faceta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [motivoCache, setMotivoCache] = useState<MotivoDeCache | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Se debouncea el texto, no la sección ni la página: tipear dispara un
  // request por tecla, hacer click en una sección no.
  const qDebounced = useDebounce(q, 250);

  useEffect(() => {
    void listarSecciones().then(setSecciones);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    void listarReglas({ q: qDebounced || undefined, filtro: cat ?? undefined, page })
      .then((pagina) => {
        if (cancelado) return;
        setReglas(pagina.entradas);
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
  }, [qDebounced, cat, page]);

  /** Cambiar filtro o búsqueda vuelve a la página 1: si no, queda vacía. */
  function actualizar(cambios: Record<string, string | null>): void {
    const siguiente = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === '') siguiente.delete(k);
      else siguiente.set(k, v);
    }
    if (!('page' in cambios)) siguiente.delete('page');
    setParams(siguiente, { replace: true });
  }

  const totalSecciones = secciones.reduce((n, s) => n + s.count, 0);

  return (
    <CodexLayout
      titulo="Reglas especiales"
      descripcion="Las reglas especiales de Warhammer: The Old World, buscables y listas para imprimir."
    >
      <section className="codex-hero">
        <div className="codex-hero-overlay" />
        <div className="codex-wide relative z-10 pb-10 pt-12 md:pt-16">
          <p className="codex-label mb-3">§ Reglas especiales · Codex</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              {totalSecciones > 0 ? `${totalSecciones} reglas` : 'Reglas'} de The Old World.
            </h1>
            <CodexSearchBox
              value={q}
              onChange={(v) => actualizar({ q: v })}
              placeholder="Buscar regla (carga, cobertura, frenzy…)"
              label="Buscar reglas"
            />
          </div>
          <hr className="codex-divider-accent mt-6" />
        </div>
      </section>

      <section className="codex-wide py-10">
        <details className="codex-no-print mb-8">
          <summary className="flex cursor-pointer items-center gap-2 text-sm codex-accent">
            <Sparkles size={14} />
            Preguntarle al oráculo
          </summary>
          <div className="mt-3">
            <OraclePanel />
          </div>
        </details>

        {secciones.length > 0 && (
          <>
            <FacetNav
              facetas={secciones}
              seleccion={cat}
              onSelect={(v) => actualizar({ cat: v })}
              etiquetaTodos="Todas"
              total={totalSecciones}
            />
            <hr className="codex-divider my-6" />
          </>
        )}

        <AvisoDeCache motivo={motivoCache} enCache={reglas.length} />

        {error && (
          <div className="codex-block">
            <p className="font-serif text-xl codex-accent">No se pudieron traer las reglas.</p>
            <p className="mt-1 text-sm codex-muted">{error}</p>
          </div>
        )}

        {!error && cargando && reglas.length === 0 && (
          <p className="text-sm codex-muted">Cargando…</p>
        )}

        {!error && !cargando && reglas.length === 0 && (
          <div className="codex-block">
            <p className="font-serif text-xl codex-accent">
              {q || cat
                ? 'Nada coincide con esa búsqueda.'
                : motivoCache
                  ? 'Todavía no hay reglas en este dispositivo.'
                  : 'No hay reglas cargadas todavía.'}
            </p>
            <p className="mt-1 text-sm codex-muted">
              {q || cat ? (
                'Probá con otro término o sacá el filtro de sección.'
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

        {reglas.length > 0 && (
          <>
            {cat && (
              <h2 className="mb-5 font-serif text-2xl">
                {titulo(cat)} <span className="font-mono text-xs codex-muted">{total}</span>
              </h2>
            )}
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {reglas.map((r) => (
                <CodexRuleCard key={r.id} rule={r} />
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
