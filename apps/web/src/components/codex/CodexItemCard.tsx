/**
 * CodexItemCard — un item mágico en la lista.
 *
 * El costo en puntos va arriba y en mono: es el dato que se compara cuando se
 * arma una lista. `cost === 0` significa que el sitio no declara costo (pasa en
 * 36 de los 751 items), así que se omite en vez de mostrar "0 pts".
 */
import { Link } from 'react-router-dom';

import { nombreVisible, textoVisible, type CodexItem } from '../../lib/codex-api.js';
import { extracto } from './CodexRuleCard.js';

export function CodexItemCard({ item }: { item: CodexItem }) {
  const nombre = nombreVisible(item);
  const original = item.nameEs && item.nameEs !== item.name ? item.name : null;

  return (
    <Link to={`/items/${item.slug}`} className="codex-block">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {item.type && <span className="codex-tag">{item.type}</span>}
        {item.cost > 0 && (
          <span className="font-mono text-xs codex-accent">{item.cost} pts</span>
        )}
      </div>
      <h3 className="font-serif text-lg leading-snug">{nombre}</h3>
      {original && <p className="text-xs italic codex-muted">{original}</p>}
      <p className="mt-1 text-sm leading-relaxed codex-muted">{extracto(textoVisible(item), 180)}</p>
    </Link>
  );
}
