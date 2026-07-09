/**
 * ListSummary — footer con total de puntos y acciones (export, save).
 */
import { Save, Download, Share2 } from 'lucide-react';
import { FormattedMessage } from 'react-intl';

import { Button } from '../ui/Button.js';
import { downloadList, type ExportFormat } from '../../lib/list-export.js';
import type { List } from '@dobleuno/shared';

interface ListSummaryProps {
  list: List;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onExport: (format: ExportFormat) => void;
}

export function ListSummary({ list, canSave, saving, onSave, onExport }: ListSummaryProps) {
  return (
    <div className="sticky bottom-16 z-20 border-t border-forge-3 bg-forge-1/95 p-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-parchment-300">
          <FormattedMessage id="listas.total" defaultMessage="Total" />
        </span>
        <span className="font-serif text-2xl text-parchment-50">
          {list.totalPoints} <span className="text-sm text-bronze-400">pts</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="primary" size="sm" onClick={onSave} loading={saving} disabled={!canSave}>
          <Save size={14} /> Guardar
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onExport('json')}>
          <Download size={14} /> JSON
        </Button>
        <Button variant="secondary" size="sm" onClick={() => downloadList(list, 'text')}>
          <Share2 size={14} /> TXT
        </Button>
      </div>
    </div>
  );
}

