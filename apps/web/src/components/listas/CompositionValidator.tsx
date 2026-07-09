/**
 * CompositionValidator — panel que muestra el desglose y errores de la lista.
 */
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ListValidation } from '@dobleuno/shared';

interface CompositionValidatorProps {
  validation: ListValidation;
  totalPoints: number;
}

export function CompositionValidator({ validation, totalPoints }: CompositionValidatorProps) {
  const { breakdown, errors, warnings, valid } = validation;
  const pct = (n: number) => (totalPoints > 0 ? Math.round((n / totalPoints) * 100) : 0);

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 rounded-xl p-2 text-sm ${
        valid ? 'bg-bronze-700/20 text-bronze-200' : 'bg-blood-500/20 text-blood-200'
      }`}>
        {valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
        <span className="font-medium">
          {valid ? 'Lista válida' : `${errors.length} error${errors.length === 1 ? '' : 'es'}`}
        </span>
        {warnings.length > 0 && (
          <span className="ml-auto text-xs text-bronze-400">
            {warnings.length} advertencia{warnings.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <Row label="Lords" pts={breakdown.lords.points} pct={pct(breakdown.lords.points)} max={breakdown.lords.max} units={breakdown.lords.units} color="blood" />
        <Row label="Heroes" pts={breakdown.heroes.points} pct={pct(breakdown.heroes.points)} max={breakdown.heroes.max} units={breakdown.heroes.units} color="blood" />
        <Row label="Core" pts={breakdown.core.points} pct={pct(breakdown.core.points)} min={breakdown.core.min} units={breakdown.core.units} color="bronze" />
        <Row label="Special" pts={breakdown.special.points} pct={pct(breakdown.special.points)} max={breakdown.special.max} units={breakdown.special.units} color="bronze" />
        <Row label="Rare" pts={breakdown.rare.points} pct={pct(breakdown.rare.points)} max={breakdown.rare.max} units={breakdown.rare.units} color="blood" />
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 text-xs">
          {errors.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5 text-blood-200">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
              <span>{e.message}</span>
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-1 text-xs">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1.5 text-bronze-300">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  label,
  pts,
  pct,
  units,
  min,
  max,
  color,
}: {
  label: string;
  pts: number;
  pct: number;
  units: number;
  min?: number;
  max?: number;
  color: 'blood' | 'bronze';
}) {
  const ok =
    (min === undefined || pct >= min) && (max === undefined || pct <= max);
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-parchment-200">{label}</span>
      <span className="font-mono">{pts} pts</span>
      <span className={`ml-auto font-mono ${
        ok ? (color === 'bronze' ? 'text-bronze-400' : 'text-parchment-300') : 'text-blood-400'
      }`}>
        {pct}%
        {min !== undefined ? ` (≥${min})` : max !== undefined ? ` (≤${max})` : ''}
      </span>
      <span className="text-parchment-300">· {units} un</span>
    </div>
  );
}
