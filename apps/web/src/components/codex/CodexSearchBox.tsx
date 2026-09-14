/**
 * CodexSearchBox — buscador del Codex.
 *
 * Estado controlado por el padre, que lo sincroniza con la query string. El
 * SearchBox del portal Astro filtraba nodos del DOM con `display:none`, que
 * solo podía esconder lo que ya estaba en la página: con 1796 reglas paginadas
 * server-side eso no alcanza, porque lo buscado casi nunca está en la página.
 */
import { Search, X } from 'lucide-react';

interface CodexSearchBoxProps {
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  /** Etiqueta accesible: hay un buscador por sección. */
  label: string;
}

export function CodexSearchBox({ value, onChange, placeholder, label }: CodexSearchBoxProps) {
  return (
    <div className="codex-search codex-no-print">
      <Search size={16} className="shrink-0" style={{ color: 'var(--codex-muted)' }} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="shrink-0"
          style={{ color: 'var(--codex-muted)' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
