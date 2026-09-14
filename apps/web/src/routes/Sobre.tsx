/**
 * /sobre — qué es el Codex, cómo se arma y bajo qué términos.
 *
 * Port de portal/src/pages/sobre.astro, con el pipeline actualizado (el texto
 * viejo describía el mirror de HTML que nunca funcionó) y con el disclaimer de
 * Games Workshop que doc/legal/ANALISIS-LICENCIAS-COMPLIANCE.md venía pidiendo
 * desde la Ola 6 y no estaba en ninguna pantalla.
 */
import { useEffect, useState } from 'react';

import { CodexLayout } from '../components/codex/CodexLayout.js';
import { Sigil } from '../components/Sigil.js';
import { statsDelCodex, type CodexStats } from '../lib/codex-api.js';

export function Sobre() {
  const [stats, setStats] = useState<CodexStats | null>(null);

  useEffect(() => {
    void statsDelCodex().then(setStats);
  }, []);

  return (
    <CodexLayout titulo="Sobre" descripcion="Qué es el Codex de Dobleuno, cómo se arma y bajo qué términos.">
      <section className="codex-narrow py-12">
        <p className="codex-label mb-3">§ Sobre</p>
        <h1 className="mb-4 font-serif text-4xl leading-tight md:text-5xl">Qué es esto.</h1>
        <p className="max-w-2xl text-lg leading-relaxed">
          El Codex es el reglamento de Warhammer: The Old World, navegable y buscable, dentro de
          Dobleuno. Buscás una regla, la leés, la imprimís, y la tenés al lado de la mesa.
        </p>
        <hr className="codex-divider-accent mt-6" />

        {stats && (
          <dl className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              ['Reglas', stats.rules],
              ['Items', stats.items],
              ['Unidades', stats.units],
            ].map(([etiqueta, n]) => (
              <div key={etiqueta as string} className="border p-4" style={{ borderColor: 'var(--codex-border)' }}>
                <dt className="codex-label">{etiqueta}</dt>
                <dd className="font-mono text-2xl codex-accent">{n}</dd>
              </div>
            ))}
          </dl>
        )}

        {stats && stats.rulesTranslated === 0 && (
          <p className="mt-4 text-sm codex-muted">
            El corpus todavía está en inglés: la traducción al español es un paso aparte del
            pipeline y no corrió sobre estos datos.
          </p>
        )}

        <h2 className="mb-3 mt-10 font-serif text-2xl">Cómo se arma</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            Un script lee los tres sitemaps de{' '}
            <a href="https://tow.whfb.app" rel="noopener noreferrer" target="_blank">
              tow.whfb.app
            </a>{' '}
            (sitio comunitario que mantiene un mirror de las publicaciones oficiales de GW) y baja
            cada página. Respeta <code className="font-mono">robots.txt</code> y espera 2 segundos
            entre requests.
          </li>
          <li>
            Otro script extrae el contenido estructurado que el sitio publica embebido en cada
            página, y lo normaliza a JSON.
          </li>
          <li>
            Un validador corta el pipeline si el corpus salió degenerado. Existe porque una vez no
            estaba y nadie se enteró durante dos meses.
          </li>
          <li>Un traductor opcional pasa reglas e items al español rioplatense.</li>
          <li>El corpus se carga en Postgres y esta app lo sirve y lo cachea en tu dispositivo.</li>
        </ol>

        <h2 className="mb-3 mt-8 font-serif text-2xl">Qué no es</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>No es oficial. No estamos afiliados ni respaldados por Games Workshop.</li>
          <li>
            No reemplaza al reglamento. Verificá siempre contra la publicación oficial y sus
            erratas, sobre todo en torneo.
          </li>
          <li>
            No es perfecto. Si ves un error, abrí un issue en{' '}
            <a
              href="https://github.com/JuanoLemos/Dobleuno"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            .
          </li>
        </ul>

        <h2 className="mb-3 mt-8 font-serif text-2xl">Licencia y atribución</h2>
        <p>
          El código de Dobleuno se distribuye bajo{' '}
          <strong className="codex-accent">CC BY 4.0</strong>, sin fines comerciales.
        </p>
        <p className="mt-2">
          El contenido de las reglas proviene del mirror comunitario de tow.whfb.app, que a su vez
          reproduce publicaciones oficiales de Games Workshop. Se usa bajo fair use / nominative
          use, sin fines comerciales. Todos los derechos sobre las reglas de Warhammer: The Old
          World permanecen con Games Workshop Limited.
        </p>

        <div className="mt-12 text-center">
          <Sigil size="full" className="inline-block" />
        </div>
      </section>
    </CodexLayout>
  );
}
