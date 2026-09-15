/**
 * Tests del parser del corpus.
 *
 * ── Qué reemplazó ────────────────────────────────────────────────────────
 *
 * Había un `scripts/parser/__tests__/parser.test.ts` que no importaba el
 * parser: re-implementaba su lógica adentro del test y la corría contra cinco
 * fixtures HTML escritos a mano. Pasaba en verde mientras el parser real
 * producía 39 entradas basura, porque no lo estaba probando. Y ni siquiera
 * corría en CI: `npm test -ws` no ve `scripts/`, que no es un workspace.
 *
 * Este importa `richTextToPlain` de verdad y cubre los tres casos que
 * costaron pérdida de datos silenciosa. Cada uno tiene su bug atrás.
 */
import { describe, it, expect } from 'vitest';

import { richTextToPlain } from '../parse-tow.js';

/** Un nodo de texto de Contentful. */
function texto(value: string): unknown {
  return { nodeType: 'text', value, marks: [], data: {} };
}

function parrafo(...content: unknown[]): unknown {
  return { nodeType: 'paragraph', content, data: {} };
}

function documento(...content: unknown[]): unknown {
  return { nodeType: 'document', content, data: {} };
}

function enlace(nombre: string): unknown {
  return { nodeType: 'entry-hyperlink', content: [texto(nombre)], data: {} };
}

describe('richTextToPlain', () => {
  it('no corta la frase donde hay un link', () => {
    // El bug: paragraph se trataba como contenedor de bloques y unía a sus
    // hijos con saltos de línea, partiendo "durante la fase de Combate".
    const doc = documento(
      parrafo(texto('Un modelo puede atacar durante la '), enlace('fase de Combate'), texto('.')),
    );
    expect(richTextToPlain(doc)).toBe('Un modelo puede atacar durante la fase de Combate.');
  });

  it('separa dos referencias vecinas: son una lista, no una frase', () => {
    // El bug: "Counter ChargeFirst ChargeSwiftstride" — las reglas especiales
    // de 500 unidades, pegadas en algo ilegible e imposible de volver a partir.
    const doc = documento({
      // El sitio publica este envoltorio con nodeType vacío.
      nodeType: '',
      data: {},
      content: [enlace('Counter Charge'), enlace('First Charge'), enlace('Swiftstride')],
    });
    expect(richTextToPlain(doc)).toBe('Counter Charge, First Charge, Swiftstride');
  });

  it('incluye el perfil de las entradas embebidas', () => {
    // El bug: embedded-entry-block se descartaba. En las armas, esa entrada ES
    // el perfil: "Great Weapon" quedaba sin alcance, fuerza ni penetración.
    const doc = documento({
      nodeType: 'embedded-entry-block',
      data: {
        target: {
          fields: {
            name: 'Great Weapon (Profile)',
            range: 'Combat',
            strength: 'S+2',
            armourPiercing: '-2',
          },
        },
      },
    });
    const salida = richTextToPlain(doc);
    expect(salida).toContain('Great Weapon (Profile)');
    expect(salida).toContain('S+2');
    expect(salida).toContain('-2');
  });

  it('etiqueta el perfil en inglés, porque el corpus de origen es inglés', () => {
    // Las etiquetas estaban en castellano y este archivo escribe
    // data/processed/, que es el corpus en inglés. 381 entradas salían mitad y
    // mitad ("Alcance N/A, Fuerza 3, Penetración -1"), y ese texto es el que
    // la app muestra cuando no hay traducción y el que el traductor recibe
    // como original — o sea que el modelo veía la lengua de destino adentro
    // de la fuente.
    const doc = documento({
      nodeType: 'embedded-entry-block',
      data: {
        target: {
          fields: {
            name: 'Acidic Vomit (Profile)',
            range: 'N/A',
            strength: '3',
            armourPiercing: '-1',
          },
        },
      },
    });
    const salida = richTextToPlain(doc);
    expect(salida).toContain('Range N/A');
    expect(salida).toContain('Strength 3');
    expect(salida).toContain('AP -1');
    expect(salida).not.toMatch(/Alcance|Fuerza|Penetración|Costo|Tipo/);
  });

  it('separa los bloques de un documento con saltos de línea', () => {
    const doc = documento(parrafo(texto('Primer párrafo.')), parrafo(texto('Segundo párrafo.')));
    expect(richTextToPlain(doc)).toBe('Primer párrafo.\nSegundo párrafo.');
  });

  it('devuelve vacío para lo que no es un nodo', () => {
    expect(richTextToPlain(null)).toBe('');
    expect(richTextToPlain(undefined)).toBe('');
    expect(richTextToPlain('no soy un nodo')).toBe('');
  });
});
