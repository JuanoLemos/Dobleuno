/**
 * Export de listas a formatos portables.
 * - JSON: nuestro schema completo (round-trip)
 * - text: lista legible, una unidad por línea
 */

import type { List } from '@dobleuno/shared';

export type ExportFormat = 'json' | 'text';

const CATEGORY_LABELS: Record<string, string> = {
  lord: 'Lord',
  hero: 'Hero',
  core: 'Core',
  special: 'Special',
  rare: 'Rare',
};

export function exportList(list: List, format: ExportFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(list, null, 2);
    case 'text':
      return exportAsText(list);
  }
}

function exportAsText(list: List): string {
  const lines: string[] = [];
  lines.push(`# ${list.name}`);
  lines.push(`# ${list.faction} · ${list.totalPoints} pts`);
  lines.push('');
  const byCategory: Record<string, typeof list.units> = {
    lord: [],
    hero: [],
    core: [],
    special: [],
    rare: [],
  };
  for (const u of list.units) {
    byCategory[u.category]!.push(u);
  }
  for (const [cat, units] of Object.entries(byCategory)) {
    if (units.length === 0) continue;
    lines.push(`## ${CATEGORY_LABELS[cat] ?? cat}`);
    for (const u of units) {
      const optText = u.options.map((o) => `${o.name} (+${o.points})`).join(', ');
      const itemsText = u.magicItems.length ? ` [${u.magicItems.join(', ')}]` : '';
      const modelText = u.models ? ` × ${u.models}` : '';
      lines.push(`- ${u.name}${modelText} — ${u.points} pts${optText ? ` (${optText})` : ''}${itemsText}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** Dispara la descarga de un archivo en el browser. */
export function downloadList(list: List, format: ExportFormat): void {
  const content = exportList(list, format);
  const blob = new Blob([content], {
    type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${list.name.replace(/\s+/g, '-').toLowerCase()}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
