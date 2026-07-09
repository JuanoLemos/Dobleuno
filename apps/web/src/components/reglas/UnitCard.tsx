import { FormattedMessage } from 'react-intl';
import { Swords } from 'lucide-react';
import type { CachedUnit } from '../../lib/dexie-kb.js';
import { Card, CardHeader, CardSubtitle, CardTitle } from '../ui/Card.js';

export function UnitCard({ unit }: { unit: CachedUnit }) {
  const stats = unit.stats;
  return (
    <Card>
      <CardHeader>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-bronze-700">
            {unit.faction} · {unit.category}
            {unit.pointsPerModel && ` · ${unit.pointsPerModel} pts/model`}
            {unit.pointsFixed && ` · ${unit.pointsFixed} pts`}
          </p>
          <CardTitle>
            <Swords size={14} className="mr-1 inline" /> {unit.name}
          </CardTitle>
          <CardSubtitle>
            <FormattedMessage id="unit.minSize" defaultMessage="Min" />: {unit.minSize}
            {unit.maxSize && ` - ${unit.maxSize}`}
          </CardSubtitle>
        </div>
      </CardHeader>

      <div className="mb-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        <Stat label="M" value={stats.M} />
        <Stat label="WS" value={stats.WS} />
        <Stat label="BS" value={stats.BS} />
        <Stat label="S" value={stats.S} />
        <Stat label="T" value={stats.T} />
        <Stat label="W" value={stats.W} />
        <Stat label="I" value={stats.I} />
        <Stat label="A" value={stats.A} />
        <Stat label="Ld" value={stats.Ld} />
        <Stat label="Sv" value={stats.Sv} />
      </div>

      {unit.weapons.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-parchment-300">Armas</p>
          <ul className="space-y-1 text-sm">
            {unit.weapons.map((w, i) => (
              <li
                key={`${w.name}-${i}`}
                className="flex justify-between border-b border-dashed border-forge-3 py-1"
              >
                <span>{w.name}</span>
                <span className="font-mono text-xs text-parchment-300">
                  {w.range} · S{w.strength}
                  {w.armorPenetration > 0 && ` · AP-${w.armorPenetration}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unit.specialRules.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-parchment-300">
            Reglas especiales
          </p>
          <div className="flex flex-wrap gap-1">
            {unit.specialRules.map((r) => (
              <span
                key={r}
                className="rounded-full bg-forge-2 px-2 py-0.5 text-xs text-parchment-200"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-forge-3 bg-forge-2 p-1 text-center">
      <p className="text-[8px] uppercase tracking-wider text-parchment-300">{label}</p>
      <p className="font-mono text-sm font-bold text-parchment-50">{value}</p>
    </div>
  );
}
