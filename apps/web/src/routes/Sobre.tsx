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

/**
 * Qué está en español y qué no, con los números de la base.
 *
 * Antes acá había un cartel binario: si `rulesTranslated` era 0 avisaba que
 * todo estaba en inglés, y si no era 0 **no decía nada**. Pero el estado real
 * del corpus nunca es binario, así que el silencio se leía como "está todo
 * traducido" justo cuando no lo está:
 *
 *   · Las unidades de los 16 ejércitos no se traducen nunca, por diseño. Su
 *     contenido son statlines y nombres propios, y la guía de traducción manda
 *     dejarlos en inglés. El jugador entra a /ejercitos, ve inglés, y la página
 *     que tenía que explicárselo se callaba.
 *   · Siempre quedan reglas sueltas sin traducir: las que no entran en el
 *     presupuesto de tokens del modelo ni de a una.
 *
 * Por eso dice los números en vez de un adjetivo.
 */
function EstadoDeTraduccion({ stats }: { stats: CodexStats }) {
  const traducidas = stats.rulesTranslated + stats.itemsTranslated;

  if (traducidas === 0) {
    return (
      <p className="mt-4 text-sm codex-muted">
        El corpus está en inglés: la traducción al español es un paso aparte del pipeline y no
        corrió sobre estos datos.
      </p>
    );
  }

  const faltanReglas = stats.rules - stats.rulesTranslated;
  const faltanItems = stats.items - stats.itemsTranslated;
  const sueltas = faltanReglas + faltanItems;

  return (
    <div className="mt-4 space-y-2 text-sm codex-muted">
      <p>
        <strong className="codex-accent">Reglas e items están en español rioplatense</strong> —{' '}
        {stats.rulesTranslated} de {stats.rules} reglas y {stats.itemsTranslated} de {stats.items}{' '}
        items. La traducción es automática y está sin revisar a mano: ante cualquier duda de
        interpretación, el original en inglés manda.
      </p>
      <p>
        <strong>Las {stats.units} unidades de los ejércitos siguen en inglés</strong>, a propósito.
        Son statlines y nombres propios —perfiles, equipo, opciones— donde traducir el nombre de una
        unidad o de un arma la vuelve imposible de cruzar con el reglamento oficial y con el resto
        de la mesa.
      </p>
      {sueltas > 0 && (
        <p>
          Quedan {sueltas} entradas sin traducir ({faltanReglas} reglas, {faltanItems} items): son
          las que no entran en el presupuesto de tokens del modelo ni de a una. Se muestran en
          inglés.
        </p>
      )}
    </div>
  );
}

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

        {stats && <EstadoDeTraduccion stats={stats} />}

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
          <li>
            Un traductor opcional pasa reglas e items al español rioplatense. Las unidades no: ver
            arriba.
          </li>
          <li>
            Un último paso unifica el glosario. La traducción va en lotes independientes, así que
            una misma regla especial termina con un nombre en su ficha y otro cada vez que otra
            ficha la cita. Este paso deja uno solo —el de la ficha— para que las referencias entre
            reglas se puedan seguir.
          </li>
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
