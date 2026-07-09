/**
 * UnitPickerModal — modal para elegir una unidad del catálogo.
 * Mobile-first: full-screen en mobile, modal centrado en desktop.
 */
import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import type { KBUnit, FactionId } from '@dobleuno/shared';

import { unitsApi } from '../../lib/units-api.js';

interface UnitPickerModalProps {
  faction: FactionId;
  onSelect: (unit: KBUnit) => void;
  onClose: () => void;
}

export function UnitPickerModal({ faction, onSelect, onClose }: UnitPickerModalProps) {
  const [units, setUnits] = useState<KBUnit[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await unitsApi.list(faction);
      if (!cancelled) {
        setUnits(res.units);
        setLoading(false);
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
          {(['all', 'lord', 'hero', 'core', 'special', 'rare'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-3 py-1 ${
                category === c ? 'bg-blood-500 text-parchment-50' : 'bg-forge-2 text-parchment-300'
              }`}
            >
              {c === 'all' ? 'Todas' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-parchment-300">Cargando…</p>
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
