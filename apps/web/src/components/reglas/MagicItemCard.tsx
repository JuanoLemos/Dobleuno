import { Sparkles } from 'lucide-react';
import type { CachedMagicItem } from '../../lib/dexie-kb.js';
import { Card, CardHeader, CardTitle } from '../ui/Card.js';

const RARITY_COLORS: Record<CachedMagicItem['rarity'], string> = {
  common: 'bg-forge-2 text-parchment-200',
  uncommon: 'bg-bronze-700/30 text-bronze-200',
  rare: 'bg-blood-500/20 text-blood-200',
  'very-rare': 'bg-blood-500/40 text-parchment-50 border border-blood-500/30',
};

export function MagicItemCard({ item }: { item: CachedMagicItem }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex-1">
          <CardTitle>
            <Sparkles size={14} className="mr-1 inline" /> {item.name}
          </CardTitle>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RARITY_COLORS[item.rarity]}`}>
              {item.rarity}
            </span>
            <span className="font-mono text-xs text-bronze-400">{item.points} pts</span>
          </div>
        </div>
      </CardHeader>
      <p className="whitespace-pre-line text-sm text-parchment-200">{item.description}</p>
    </Card>
  );
}
