/**
 * FacetNav — navegación por sección del reglamento (o familia de item).
 *
 * El portal Astro tenía 8 categorías fijas con su número romano hardcodeado.
 * El corpus real trae 31 secciones de reglamento y 8 tipos de item, así
 * que las facetas vienen del server con su conteo y el romano se calcula.
 */
interface FacetNavProps {
  facetas: Array<{ valor: string; count: number }>;
  seleccion: string | null;
  onSelect: (valor: string | null) => void;
  etiquetaTodos: string;
  total: number;
}

/** Los slugs del sitio vienen en kebab: 'the-combat-phase' → 'The Combat Phase'. */
export function titulo(slug: string): string {
  return slug
    .split('-')
    .map((p) => (p.length > 2 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

/**
 * Etiqueta de una lista de items.
 *
 * Los slugs del sitio son 'empire-of-man-magic-items-type' y
 * 'forest-spites-type'. Pasados por `titulo()` quedan "Empire Of Man Magic
 * Items Type", que es ruido: el sufijo se repite en todas y no distingue nada.
 * Lo que importa es de quién es la lista.
 */
export function tituloDeLista(slug: string): string {
  return titulo(slug.replace(/-magic-items-type$/, '').replace(/-type$/, ''));
}

const ROMANOS: Array<[number, string]> = [
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function romano(n: number): string {
  let resto = n;
  let salida = '';
  for (const [valor, simbolo] of ROMANOS) {
    while (resto >= valor) {
      salida += simbolo;
      resto -= valor;
    }
  }
  return salida;
}

export function FacetNav({ facetas, seleccion, onSelect, etiquetaTodos, total }: FacetNavProps) {
  return (
    <nav className="codex-no-print flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Secciones">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={seleccion === null ? 'codex-accent' : 'codex-muted'}
      >
        {etiquetaTodos} <span className="font-mono text-xs">({total})</span>
      </button>
      {facetas.map((f, i) => (
        <button
          key={f.valor}
          type="button"
          onClick={() => onSelect(f.valor)}
          className={seleccion === f.valor ? 'codex-accent' : 'codex-muted'}
        >
          <span className="codex-label mr-1">§ {romano(i + 1)}</span>
          {titulo(f.valor)} <span className="font-mono text-xs">({f.count})</span>
        </button>
      ))}
    </nav>
  );
}
