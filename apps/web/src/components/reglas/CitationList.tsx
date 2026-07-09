/**
 * Cliente: CitationList — muestra las citas de la respuesta del oracle.
 * Ola 5.
 */
import { ScrollText, BookOpen, Sword, Package, HelpCircle, Map } from 'lucide-react';
import type { Citation } from '@dobleuno/shared';
import { Card } from '../ui/Card.js';

interface CitationListProps {
  citations: Citation[];
}

const SOURCE_ICONS = {
  unit: Sword,
  rule: BookOpen,
  item: Package,
  scenario: Map,
  faq: HelpCircle,
} as const;

const SOURCE_LABELS = {
  unit: 'Unidad',
  rule: 'Regla',
  item: 'Item',
  scenario: 'Escenario',
  faq: 'FAQ',
} as const;

export function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-parchment-300">
        <ScrollText size={12} /> Citas ({citations.length})
      </h3>
      <ul className="space-y-2">
        {citations.map((c, i) => {
          const Icon = SOURCE_ICONS[c.source];
          const label = SOURCE_LABELS[c.source];
          return (
            <li key={`${c.ref}-${i}`}>
              <Card>
                <div className="flex items-start gap-2">
                  <Icon size={14} className="mt-0.5 flex-shrink-0 text-bronze-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-bronze-400">
                      [{i + 1}] {label} · {c.ref}
                    </p>
                    <p className="mt-0.5 text-sm font-serif text-parchment-50">{c.title}</p>
                    <p className="mt-1 text-xs text-parchment-300">{c.text}</p>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}