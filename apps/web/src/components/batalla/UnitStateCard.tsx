/**
 * Cliente: UnitStateCard — card de unidad con HP, status, controls.
 */
import { Minus, Plus, Trash2, Heart, Sword } from 'lucide-react';
import type { BattleUnit } from '@dobleuno/shared';
import { STATUS_LABELS } from '../../lib/battle-engine.js';
import { cn } from '../../lib/cn.js';

interface UnitStateCardProps {
  unit: BattleUnit;
  onUpdate: (u: BattleUnit) => void;
  onRemove: () => void;
}

export function UnitStateCard({ unit, onUpdate, onRemove }: UnitStateCardProps) {
  const pct = unit.modelsStart > 0 ? (unit.modelsCurrent / unit.modelsStart) * 100 : 0;

  function changeModels(delta: number): void {
    const next = Math.max(0, Math.min(unit.modelsStart, unit.modelsCurrent + delta));
    onUpdate({ ...unit, modelsCurrent: next, status: next === 0 ? 'destroyed' : unit.status });
  }

  function takeDamage(): void {
    changeModels(-1);
  }

  return (
    <div className={cn('rounded-xl border bg-forge-1 p-3', unit.faction === 'player' ? 'border-bronze-500/30' : 'border-blood-500/30')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-serif text-base text-parchment-50">{unit.name}</p>
          <p className="text-xs text-parchment-300">
            {unit.faction === 'player' ? '🎖️' : '⚔️'} {unit.status && STATUS_LABELS[unit.status]}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="touch-target flex items-center justify-center rounded-full p-2 text-blood-400 hover:bg-forge-2"
          aria-label="Eliminar"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* HP bar */}
      <div className="mt-2 flex items-center gap-2">
        <Heart size={12} className="text-blood-400" />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-forge-2">
          <div
            className="h-full bg-blood-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-parchment-200">
          {unit.modelsCurrent}/{unit.modelsStart}
        </span>
      </div>

      <div className="mt-2 flex gap-1">
        <button
          onClick={() => changeModels(1)}
          disabled={unit.modelsCurrent >= unit.modelsStart}
          className="flex-1 touch-target rounded-lg bg-forge-2 py-1.5 text-xs hover:bg-bronze-700/30 disabled:opacity-30"
        >
          <Plus size={12} className="inline" /> Sumar
        </button>
        <button
          onClick={takeDamage}
          disabled={unit.modelsCurrent === 0}
          className="flex-1 touch-target rounded-lg bg-forge-2 py-1.5 text-xs hover:bg-blood-500/30 disabled:opacity-30"
        >
          <Minus size={12} className="inline" /> Herir
        </button>
      </div>

      {unit.activeEffects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {unit.activeEffects.map((e) => (
            <span
              key={e}
              className="rounded-full bg-bronze-700/30 px-2 py-0.5 text-[10px] text-bronze-200"
            >
              {e}
            </span>
          ))}
        </div>
      )}

      {unit.status === 'fleeing' && (
        <p className="mt-2 flex items-center gap-1 text-xs text-blood-300">
          <Sword size={12} /> huyendo
        </p>
      )}
    </div>
  );
}
