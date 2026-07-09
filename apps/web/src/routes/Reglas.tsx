import { useState, useEffect, useDeferredValue } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Search as SearchIcon, Database, WifiOff } from 'lucide-react';

import { Card } from '../components/ui/Card.js';
import { Input } from '../components/ui/Input.js';
import { searchKB, type SearchResult } from '../lib/kb-sync.js';
import { useUIStore } from '../lib/store.js';
import { UnitCard } from '../components/reglas/UnitCard.js';
import { RuleCard } from '../components/reglas/RuleCard.js';
import { MagicItemCard } from '../components/reglas/MagicItemCard.js';

export function Reglas() {
  const [query, setQuery] = useState('');
  const [faction, setFaction] = useState<'empire' | 'bretonnia' | undefined>(undefined);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const online = useUIStore((s) => s.online);
  const { formatMessage } = useIntl();

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await searchKB({ q: deferredQuery, faction });
        if (!cancelled) setResults(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [deferredQuery, faction]);

  // Mostrar loading solo si el usuario tipeó algo (no en el render inicial vacío)
  const showLoading = loading && deferredQuery.length > 0;

  const totalResults = results
    ? results.units.length + results.rules.length + results.items.length
    : 0;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">
          <FormattedMessage id="reglas.title" defaultMessage="Reglamento" />
        </h1>
        {results?.fromCache && (
          <span className="flex items-center gap-1 text-xs text-bronze-400">
            <Database size={12} />
            cache
          </span>
        )}
      </header>

      <Input
        placeholder={formatMessage({ id: 'reglas.search.placeholder' })}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        startIcon={<SearchIcon size={16} />}
      />

      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setFaction(undefined)}
          className={`rounded-full px-3 py-1 ${
            !faction ? 'bg-blood-500 text-parchment-50' : 'bg-forge-2 text-parchment-300'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFaction('empire')}
          className={`rounded-full px-3 py-1 ${
            faction === 'empire' ? 'bg-blood-500 text-parchment-50' : 'bg-forge-2 text-parchment-300'
          }`}
        >
          Imperio
        </button>
        <button
          onClick={() => setFaction('bretonnia')}
          className={`rounded-full px-3 py-1 ${
            faction === 'bretonnia' ? 'bg-blood-500 text-parchment-50' : 'bg-forge-2 text-parchment-300'
          }`}
        >
          Bretonia
        </button>
      </div>

      {!online && (
        <div className="flex items-center gap-2 rounded-xl border border-bronze-500/30 bg-bronze-500/5 p-3 text-sm text-bronze-200">
          <WifiOff size={16} />
          <FormattedMessage id="common.offline" defaultMessage="Sin conexión" /> · cache local
        </div>
      )}

      {showLoading && (
        <p className="text-sm text-parchment-300">
          <FormattedMessage id="common.loading" defaultMessage="Cargando..." />
        </p>
      )}

      {!showLoading && totalResults === 0 && (
        <Card>
          <p className="py-6 text-center text-sm text-parchment-300">
            <FormattedMessage id="reglas.empty" defaultMessage="Buscá una regla o una unidad." />
          </p>
        </Card>
      )}

      {results && results.units.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-widest text-parchment-300">
            Unidades ({results.units.length})
          </h2>
          {results.units.map((u) => (
            <UnitCard key={u.id} unit={u} />
          ))}
        </section>
      )}

      {results && results.rules.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-widest text-parchment-300">
            Reglas especiales ({results.rules.length})
          </h2>
          {results.rules.map((r) => (
            <RuleCard key={r.id} rule={r} />
          ))}
        </section>
      )}

      {results && results.items.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-widest text-parchment-300">
            Items mágicos ({results.items.length})
          </h2>
          {results.items.map((i) => (
            <MagicItemCard key={i.id} item={i} />
          ))}
        </section>
      )}
    </div>
  );
}
