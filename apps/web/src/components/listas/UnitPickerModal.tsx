/**
 * UnitPickerModal — modal para elegir una unidad del catálogo.
 * Mobile-first: full-screen en mobile, modal centrado en desktop.
 */
import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import type { KBUnit, FactionId } from '@dobleuno/shared';

import { unitsApi } from '../../lib/units-api.js';

/**
 * Las categorías que el catálogo puede distinguir de verdad.
 *
 * Eran seis (lord/hero/core/special/rare/all), heredadas del tipo `KBUnit`. El
 * corpus de tow.whfb.app no publica la categoría de lista de ejército, así que
 * cuatro de esos botones filtraban a cero. Ver el mapeo en lib/units-api.ts.
 */
type Categoria = 'all' | 'hero' | 'core';

const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  all: 'Todas',
  hero: 'Personajes',
  core: 'Tropas',
};

interface UnitPickerModalProps {
  faction: FactionId;
  onSelect: (unit: KBUnit) => void;
  onClose: () => void;
}

export function UnitPickerModal({ faction, onSelect, onClose }: UnitPickerModalProps) {
  const [units, setUnits] = useState<KBUnit[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Categoria>('all');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await unitsApi.list(faction);
        if (!cancelled) setUnits(res.units);
      } catch (err) {
        // Sin base, /api/units responde 503. Antes esto quedaba como una
        // promesa rechazada y el modal se quedaba en "Cargando…" para siempre.
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [faction]);

  const filtered = units.filter(
    (u) =>
      (category === 'all' || u.category === category) &&
      (!filter || u.name.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-forge-0 animate-fade-in">
      <header className="flex items-center justify-between border-b border-forge-3 p-4">
        <h2 className="font-serif text-xl">Elegir unidad</h2>
        <button
          onClick={onClose}
          className="touch-target flex items-center justify-center rounded-full p-2 hover:bg-forge-2"
        >
          <X size={20} />
        </button>
      </header>

      <div className="border-b border-forge-3 p-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-300"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar unidad…"
            className="h-11 w-full rounded-xl border border-forge-3 bg-forge-1 pl-10 pr-4 text-parchment-50 focus:border-blood-500 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto text-xs">
          {(Object.keys(ETIQUETA_CATEGORIA) as Categoria[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-3 py-1 ${
                category === c ? 'bg-blood-500 text-parchment-50' : 'bg-forge-2 text-parchment-300'
              }`}
            >
              {ETIQUETA_CATEGORIA[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-parchment-300">Cargando…</p>
        ) : error ? (
          <p className="text-center text-sm text-blood-200">
            No se pudo traer el catálogo: {error}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-parchment-300">Sin resultados</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => onSelect(u)}
                  className="w-full rounded-xl border border-forge-3 bg-forge-1 p-3 text-left transition-colors hover:border-blood-500 active:bg-forge-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif text-base text-parchment-50">{u.name}</p>
                      <p className="text-xs text-parchment-300">
                        {u.category}
                        {u.pointsPerModel ? ` · ${u.pointsPerModel} pts/model` : u.pointsFixed ? ` · ${u.pointsFixed} pts` : ''}
                      </p>
                    </div>
                    <div className="text-right text-xs text-bronze-400">
                      {u.stats.M}/{u.stats.WS}/{u.stats.BS}/{u.stats.S}/{u.stats.T}/{u.stats.W}/{u.stats.I}/{u.stats.A}/{u.stats.Ld}
                      <br />
                      Sv {u.stats.Sv}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
