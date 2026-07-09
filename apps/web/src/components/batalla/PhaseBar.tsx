/**
 * Cliente: PhaseBar — muestra la fase actual y permite navegar.
 */
import { PHASES, PHASE_LABELS } from '../../lib/battle-engine.js';
import type { GamePhase } from '@dobleuno/shared';
import { cn } from '../../lib/cn.js';

interface PhaseBarProps {
  current: GamePhase;
  turn: number;
  onChange: (p: GamePhase) => void;
}

export function PhaseBar({ current, turn, onChange }: PhaseBarProps) {
  const i = PHASES.indexOf(current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-forge-1 p-1">
      {PHASES.map((p, idx) => {
        const done = idx < i;
        const active = p === current;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'flex flex-1 min-w-[60px] flex-col items-center rounded-lg px-2 py-1.5 text-[10px] uppercase tracking-wide transition-colors',
              active && 'bg-blood-500 text-parchment-50',
              !active && done && 'bg-bronze-700/30 text-bronze-200',
              !active && !done && 'bg-forge-2 text-parchment-300 hover:bg-forge-3',
            )}
          >
            <span className="text-base">
              {idx === 0 ? '▶' : done ? '✓' : '○'}
            </span>
            <span>{PHASE_LABELS[p]}</span>
          </button>
        );
      })}
      <div className="ml-2 whitespace-nowrap text-xs text-parchment-300">T{turn + 1}</div>
    </div>
  );
}
