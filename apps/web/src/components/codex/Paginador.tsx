/**
 * Paginador — anterior / siguiente sobre una lista paginada server-side.
 *
 * Deliberadamente sin números de página: con 1796 reglas en 60 páginas, una
 * fila de 60 botones no ayuda a nadie. La navegación real del Codex es el
 * buscador y las secciones.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginadorProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export function Paginador({ page, limit, total, onChange }: PaginadorProps) {
  const ultima = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;

  const desde = (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);

  return (
    <div className="codex-no-print mt-8 flex items-center justify-between gap-4">
      <button
        type="button"
        className="codex-cta-ghost disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={14} className="mr-1 inline" />
        Anterior
      </button>

      <p className="font-mono text-xs codex-muted">
        {desde}–{hasta} de {total}
      </p>

      <button
        type="button"
        className="codex-cta-ghost disabled:opacity-40"
        disabled={page >= ultima}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
        <ChevronRight size={14} className="ml-1 inline" />
      </button>
    </div>
  );
}
