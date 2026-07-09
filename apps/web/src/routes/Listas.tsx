import { FormattedMessage } from 'react-intl';
import { ScrollText, Plus } from 'lucide-react';

import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';

export function Listas() {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">
          <FormattedMessage id="listas.title" defaultMessage="Mis listas" />
        </h1>
        <Button size="sm" variant="primary">
          <Plus size={16} />
          <FormattedMessage id="listas.new" defaultMessage="Nueva lista" />
        </Button>
      </header>
      <Card>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <ScrollText size={32} className="text-parchment-300/40" />
          <p className="text-sm text-parchment-300">
            <FormattedMessage id="listas.empty" defaultMessage="No tenés listas todavía. Armá tu primer ejército." />
          </p>
        </div>
      </Card>
    </div>
  );
}
