/**
 * Tests del normalizador de glosario.
 *
 * El que importa es `no colapsa dos reglas distintas`: este script edita el
 * corpus que después se siembra, y un reemplazo de más no rompe nada visible
 * — produce una ficha que dice otra cosa que el original, en silencio. Es
 * exactamente el modo de falla que el resto del proyecto viene persiguiendo.
 */
import { describe, it, expect } from 'vitest';
import {
  construirGlosario,
  normalizar,
  normalizarEntrada,
  type EntradaTraducida,
} from '../normalizar-glosario.js';

function ficha(p: Partial<EntradaTraducida> & { id: string }): EntradaTraducida {
  return { name: '', text: '', nameEs: '', textEs: '', ...p };
}

/** El caso real que motivó el script, reducido a lo mínimo. */
const CORPUS: EntradaTraducida[] = [
  ficha({
    id: 'rule-flaming-attacks',
    name: 'Flaming Attacks',
    nameEs: 'Ataques Ígneos',
    text: 'Any attack made by a model with this special rule is a Flaming attack.',
    textEs: 'Cualquier ataque hecho por un modelo con esta regla especial es un ataque Ígneo.',
  }),
  ficha({
    id: 'rule-poisoned-attacks',
    name: 'Poisoned Attacks',
    nameEs: 'Ataques Envenenados',
    text: 'A model with Poisoned Attacks wounds automatically on a roll of 6.',
    textEs: 'Un modelo con Ataques Envenenados hiere automáticamente con un 6.',
  }),
  ficha({
    id: 'rule-blessings-of-ulric',
    name: 'Blessings of Ulric',
    nameEs: 'Bendiciones de Ulric',
    text: 'A 6+ Ward save against wounds caused by an attack with the Flaming Attacks special rule.',
    textEs:
      'Una Ward save de 6+ contra heridas causadas por un ataque con la regla especial Ataques Flamígeros.',
  }),
  ficha({
    id: 'rule-dragon-breath',
    name: 'Dragon Breath',
    nameEs: 'Aliento de Dragón',
    text: 'This attack has the Flaming Attacks special rule and the Poisoned Attacks special rule.',
    textEs:
      'Este ataque tiene la regla especial Flaming Attacks y la regla especial Ataques Envenenados.',
  }),
];

describe('construirGlosario', () => {
  const glosario = construirGlosario(CORPUS);

  it('incluye los términos que otra ficha cita', () => {
    expect(glosario.map((t) => t.en)).toContain('Flaming Attacks');
    expect(glosario.map((t) => t.en)).toContain('Poisoned Attacks');
  });

  it('deja afuera los que nadie cita', () => {
    // Nadie menciona "Blessings of Ulric" ni "Dragon Breath" en su texto.
    expect(glosario.map((t) => t.en)).not.toContain('Blessings of Ulric');
    expect(glosario.map((t) => t.en)).not.toContain('Dragon Breath');
  });

  it('toma el nameEs de la propia ficha como canónico', () => {
    expect(glosario.find((t) => t.en === 'Flaming Attacks')?.es).toBe('Ataques Ígneos');
  });

  it('ordena de nombre más largo a más corto', () => {
    const largos = glosario.map((t) => t.en.length);
    expect([...largos].sort((a, b) => b - a)).toEqual(largos);
  });

  it('descarta un nombre en inglés que tengan dos fichas distintas', () => {
    const ambiguo = construirGlosario([
      ...CORPUS,
      ficha({
        id: 'item-flaming-attacks',
        name: 'Flaming Attacks',
        nameEs: 'Otra Cosa',
        text: 'x',
        textEs: 'x',
      }),
    ]);
    expect(ambiguo.map((t) => t.en)).not.toContain('Flaming Attacks');
  });
});

describe('normalizar', () => {
  const glosario = construirGlosario(CORPUS);

  it('unifica la cita que quedó en inglés', () => {
    const { entradas } = normalizar(CORPUS, glosario);
    const dragon = entradas.find((e) => e.id === 'rule-dragon-breath');
    expect(dragon?.textEs).toContain('regla especial Ataques Ígneos');
    expect(dragon?.textEs).not.toContain('Flaming Attacks');
  });

  it('unifica la variante traducida distinto', () => {
    const { entradas } = normalizar(CORPUS, glosario);
    const ulric = entradas.find((e) => e.id === 'rule-blessings-of-ulric');
    expect(ulric?.textEs).toContain('Ataques Ígneos');
    expect(ulric?.textEs).not.toContain('Ataques Flamígeros');
  });

  it('NO colapsa dos reglas distintas', () => {
    // `Dragon Breath` cita las dos reglas y su texto ya nombra bien a
    // Poisoned Attacks. Si el script tomara "Ataques Envenenados" como
    // variante de "Flaming Attacks", las fusionaría — y la ficha diría algo
    // que el original no dice, sin que nada falle.
    const { entradas } = normalizar(CORPUS, glosario);
    const dragon = entradas.find((e) => e.id === 'rule-dragon-breath');
    expect(dragon?.textEs).toContain('Ataques Envenenados');
    expect(dragon?.textEs).toContain('Ataques Ígneos');
  });

  it('no toca la ficha del propio término', () => {
    const { entradas } = normalizar(CORPUS, glosario);
    const propia = entradas.find((e) => e.id === 'rule-flaming-attacks');
    expect(propia?.textEs).toBe(
      CORPUS.find((e) => e.id === 'rule-flaming-attacks')?.textEs,
    );
  });

  it('no reemplaza si el original no cita el término', () => {
    // El texto en castellano nombra la regla pero el inglés no la menciona:
    // sin esa prueba, cualquier coincidencia de palabras dispararía un cambio.
    const suelta = ficha({
      id: 'rule-suelta',
      name: 'Suelta',
      nameEs: 'Suelta',
      text: 'Nothing to see here.',
      textEs: 'El modelo hace Ataques Flamígeros de mentira.',
    });
    const { entradas } = normalizar([...CORPUS, suelta], construirGlosario([...CORPUS, suelta]));
    expect(entradas.find((e) => e.id === 'rule-suelta')?.textEs).toContain('Ataques Flamígeros');
  });

  it('es idempotente', () => {
    const una = normalizar(CORPUS, glosario);
    const dos = normalizar(una.entradas, construirGlosario(una.entradas));
    expect(dos.entradas.map((e) => e.textEs)).toEqual(una.entradas.map((e) => e.textEs));
    expect(dos.reemplazos).toEqual([]);
  });

  it('reporta lo que no puede resolver en vez de adivinar', () => {
    const perdida = ficha({
      id: 'rule-perdida',
      name: 'Perdida',
      nameEs: 'Perdida',
      text: 'This model has the Flaming Attacks special rule.',
      // La cita se disolvió en prosa: no hay frase candidata que tomar.
      textEs: 'Este modelo prende fuego todo lo que toca.',
    });
    const r = normalizarEntrada(perdida, glosario);
    expect(r.reemplazos).toEqual([]);
    expect(r.sinResolver.map((s) => s.termino)).toContain('Flaming Attacks');
    expect(r.textoEs).toBe(perdida.textEs);
  });

  it('no se come un nombre de regla más largo que empieza igual', () => {
    // Caso real medido sobre el corpus: existe la ficha "Armour" y existen
    // "Armour Bane" y "Armour Piercing", que el glosario todavía no tiene.
    // Las 59 menciones en perfiles de arma se convertían en "Armadura Bane
    // (1)" — un término inexistente, escrito sin un solo error.
    const corpus: EntradaTraducida[] = [
      ficha({
        id: 'rule-armour',
        name: 'Armour',
        nameEs: 'Armadura',
        text: 'Armour protects a model.',
        textEs: 'La Armadura protege a un modelo.',
      }),
      ficha({
        id: 'rule-arma',
        name: 'Un Arma',
        nameEs: 'Un Arma',
        text: 'Range 6", Strength 3, AP -1 · Armour Bane (1), Quick Shot. Armour matters.',
        textEs: 'Alcance 6", Fuerza 3, Penetración -1 · Armour Bane (1), Quick Shot.',
      }),
    ];
    const { entradas, sinResolver } = normalizar(corpus, construirGlosario(corpus));
    const arma = entradas.find((e) => e.id === 'rule-arma');
    expect(arma?.textEs).toContain('Armour Bane (1)');
    expect(arma?.textEs).not.toContain('Armadura Bane');
    expect(sinResolver.map((s) => s.motivo)).toContain('parte-de-nombre-mas-largo');
  });

  it('no arma una variante cruzando un salto de línea', () => {
    // El corpus conserva los saltos del original: separan el perfil del arma
    // de su texto. Con `\s` en el patrón, la última palabra de una línea y la
    // primera de la siguiente formaban una "variante" inventada
    // ("Mercenarios\nHasta"), y aplicarla pegaba dos oraciones en una.
    const corpus: EntradaTraducida[] = [
      ficha({
        id: 'rule-mercenaries',
        name: 'Mercenaries',
        nameEs: 'Mercenarios Díscolos',
        text: 'Mercenaries may misbehave.',
        textEs: 'Los Mercenarios Díscolos pueden portarse mal.',
      }),
      ficha({
        id: 'rule-contrato',
        name: 'Contrato',
        nameEs: 'Contrato',
        text: 'This unit may include Mercenaries.',
        textEs: 'Esta unidad puede incluir Mercenarios\nHasta tres unidades por ejército.',
      }),
    ];
    const { entradas } = normalizar(corpus, construirGlosario(corpus));
    const contrato = entradas.find((e) => e.id === 'rule-contrato');
    expect(contrato?.textEs).toContain('\nHasta tres unidades');
    expect(contrato?.textEs).not.toContain('Mercenarios Díscolos tres unidades');
  });

  it('se abstiene cuando dos candidatas comparten la palabra cabeza', () => {
    // Límite conocido del método, no un bug. Caso real del corpus:
    // "Ataques Extra (+1), Ataques Flamígeros". Dos frases empiezan con
    // "Ataques" y ninguna es canónica de otra regla, así que el script no
    // elige. Repetir la pasada no desempata: dos términos con la misma
    // palabra cabeza ven el mismo conjunto de candidatas.
    const corpus: EntradaTraducida[] = [
      ficha({
        id: 'rule-flaming',
        name: 'Flaming Attacks',
        nameEs: 'Ataques Ígneos',
        text: 'Flaming Attacks burn.',
        textEs: 'Los Ataques Ígneos queman.',
      }),
      ficha({
        id: 'rule-extra',
        name: 'Extra Attacks',
        nameEs: 'Ataques Adicionales',
        text: 'Extra Attacks give more attacks.',
        textEs: 'Los Ataques Adicionales dan más ataques.',
      }),
      ficha({
        id: 'item-blade',
        name: 'Blade',
        nameEs: 'Blade',
        text: 'Profile · Extra Attacks (+1), Flaming Attacks',
        textEs: 'Perfil · Ataques Extra (+1), Ataques Flamígeros',
      }),
    ];
    const { entradas, sinResolver } = normalizar(corpus, construirGlosario(corpus));
    // Prefiere dejarlo como está antes que emparejar mal.
    expect(entradas.find((e) => e.id === 'item-blade')?.textEs).toBe(
      'Perfil · Ataques Extra (+1), Ataques Flamígeros',
    );
    expect(sinResolver.map((s) => s.motivo)).toContain('ambigua');
  });

  it('conserva el resto de los campos de la entrada', () => {
    const { entradas } = normalizar(CORPUS, glosario);
    for (const e of entradas) {
      const original = CORPUS.find((o) => o.id === e.id);
      expect(e.name).toBe(original?.name);
      expect(e.nameEs).toBe(original?.nameEs);
      expect(e.text).toBe(original?.text);
    }
  });
});
