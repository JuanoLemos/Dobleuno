/**
 * MetaCodex — título, descripción y `noindex` de cada página del Codex.
 *
 * ── Por qué noindex ──────────────────────────────────────────────────────
 *
 * El Codex es público y sin login, pero no se ofrece a los buscadores. El
 * contenido deriva de publicaciones de Games Workshop y el análisis legal del
 * proyecto lo marca como riesgo latente: público e indexado es la configuración
 * más expuesta posible. La decisión está escrita en el ADR-011.
 *
 * ── Lo que esto NO arregla ───────────────────────────────────────────────
 *
 * Los unfurls de Discord y WhatsApp no ejecutan JS, así que ven el <head> del
 * index.html, no lo que Helmet escribe. Para eso haría falta un middleware de
 * Open Graph por user-agent en el server. Queda fuera de esta ola a propósito.
 */
import { Helmet } from 'react-helmet-async';

interface MetaCodexProps {
  titulo: string;
  descripcion: string;
}

export function MetaCodex({ titulo, descripcion }: MetaCodexProps) {
  return (
    <Helmet>
      <title>{titulo} · Dobleuno</title>
      <meta name="description" content={descripcion} />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}
