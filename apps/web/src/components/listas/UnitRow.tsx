/**
 * UnitRow — fila de unidad en el ArmyEditor.
 * Permite ajustar modelos, command group, options, magic items, eliminar.
 */
import { Minus, Plus, Trash2, Swords } from 'lucide-react';
import type { ListUnit } from '@dobleuno/shared';

interface UnitRowProps {
  unit: ListUnit;
  onUpdate: (u: ListUnit) => void;
  onRemove: () => void;
}

export function UnitRow({ unit, onUpdate, onRemove }: UnitRowProps) {

  function changeModels(delta: number): void {
    if (!unit.models) return;
    const next = Math.max(1, unit.models + delta);
    onUpdate({ ...unit, models: next });
  }

  return (
    <div className="rounded-xl border border-forge-3 bg-forge-1 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Swords size={14} className="text-bronze-400" />
            <p className="font-serif text-base text-parchment-50">{unit.name}</p>
          </div>
          <p className="ml-5 text-xs text-parchment-300">
            {unit.category}
            {unit.models ? ` × ${unit.models}` : ''} · {unit.points} pts
          </p>
        </div>
        <button
          onClick={onRemove}
          className="touch-target flex items-center justify-center rounded-full p-2 text-blood-400 hover:bg-forge-2"
          aria-label="Eliminar unidad"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {unit.models !== undefined && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-forge-2 p-2">
          <span className="text-xs text-parchment-300">Modelos</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeModels(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-forge-3 text-parchment-50 hover:bg-blood-500"
            >
              <Minus size={12} />
            </button>
            <span className="min-w-[2ch] text-center font-mono text-sm">{unit.models}</span>
            <button
              onClick={() => changeModels(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-forge-3 text-parchment-50 hover:bg-blood-500"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {unit.options.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {unit.options.map((o, i) => (
            <span
              key={`${o.name}-${i}`}
              className="rounded-full bg-bronze-700/30 px-2 py-0.5 text-xs text-bronze-200"
            >
              {o.name} +{o.points}
            </span>
          ))}
        </div>
      )}

      {unit.magicItems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {unit.magicItems.map((m) => (
            <span
              key={m}
              className="rounded-full bg-blood-500/20 px-2 py-0.5 text-xs text-blood-200"
            >
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
