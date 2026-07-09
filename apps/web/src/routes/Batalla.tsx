import { FormattedMessage } from 'react-intl';
import { Swords, Plus } from 'lucide-react';

import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';

export function Batalla() {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">
          <FormattedMessage id="batalla.title" defaultMessage="Mis batallas" />
        </h1>
        <Button size="sm" variant="primary">
          <Plus size={16} />
          <FormattedMessage id="batalla.new" defaultMessage="Nueva batalla" />
        </Button>
      </header>
      <Card>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Swords size={32} className="text-parchment-300/40" />
          <p className="text-sm text-parchment-300">
            <FormattedMessage id="batalla.empty" defaultMessage="Sin batallas en curso." />
          </p>
        </div>
      </Card>
    </div>
  );
}
