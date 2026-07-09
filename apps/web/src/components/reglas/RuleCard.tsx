import type { CachedRule } from '../../lib/dexie-kb.js';
import { Card, CardHeader, CardSubtitle, CardTitle } from '../ui/Card.js';

export function RuleCard({ rule }: { rule: CachedRule }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-bronze-700">
            {rule.category}
          </p>
          <CardTitle>{rule.name}</CardTitle>
        </div>
      </CardHeader>
      <p className="whitespace-pre-line text-sm text-parchment-200">{rule.description}</p>
      <CardSubtitle>{rule.id}</CardSubtitle>
    </Card>
  );
}
