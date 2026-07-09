import { FormattedMessage } from 'react-intl';
import { BookOpen } from 'lucide-react';

import { Card } from '../components/ui/Card.js';
import { Input } from '../components/ui/Input.js';

export function Reglas() {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header>
        <h1 className="font-serif text-2xl">
          <FormattedMessage id="reglas.title" defaultMessage="Reglamento" />
        </h1>
      </header>
      <Input placeholder="carga a través de bosque" />
      <Card>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <BookOpen size={32} className="text-parchment-300/40" />
          <p className="text-sm text-parchment-300">
            <FormattedMessage id="reglas.empty" defaultMessage="Buscá una regla o una unidad." />
          </p>
        </div>
      </Card>
    </div>
  );
}
