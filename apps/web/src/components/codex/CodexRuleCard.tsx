/**
 * CodexRuleCard — una regla en la lista.
 *
 * Muestra el nombre visible (español si se tradujo), el original en inglés
 * cuando difiere, y un extracto. El extracto corta por la primera línea: las
 * reglas de armas empiezan con el perfil ("Alcance Combat, Fuerza S+2, …"),
 * que es justo lo que uno quiere ver sin abrir.
 */
import { Link } from 'react-router-dom';

import { nombreVisible, textoVisible, type CodexRule } from '../../lib/codex-api.js';

const LARGO_EXTRACTO = 200;

export function extracto(texto: string, largo = LARGO_EXTRACTO): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= largo) return limpio;
  // Corta en el último espacio para no partir una palabra al medio.
  const corte = limpio.slice(0, largo);
  const espacio = corte.lastIndexOf(' ');
  return `${espacio > largo * 0.6 ? corte.slice(0, espacio) : corte}…`;
}

export function CodexRuleCard({ rule }: { rule: CodexRule }) {
  const nombre = nombreVisible(rule);
  const original = rule.nameEs && rule.nameEs !== rule.name ? rule.name : null;

  return (
    <Link to={`/reglas/${rule.slug}`} className="codex-block">
      <h3 className="font-serif text-lg leading-snug">{nombre}</h3>
      {original && <p className="text-xs italic codex-muted">{original}</p>}
      <p className="mt-1 text-sm leading-relaxed codex-muted">{extracto(textoVisible(rule))}</p>
    </Link>
  );
}
