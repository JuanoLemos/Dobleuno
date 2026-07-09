/**
 * Listas route — lista de listas del usuario + CTA "Nueva".
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Plus, ScrollText, Trash2 } from 'lucide-react';

import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { listsApi } from '../lib/lists-api.js';
import { useUIStore } from '../lib/store.js';

interface ListRow {
  id: string;
  name: string;
  faction: string;
  totalPoints: number;
  updatedAt: string;
}

export function Listas() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useUIStore((s) => s.showToast);
  const { formatMessage } = useIntl();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await listsApi.list();
        if (!cancelled) setLists((res.lists) ?? []);
      } catch {
        if (!cancelled) setLists([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string): Promise<void> {
    if (!window.confirm('¿Eliminar lista?')) return;
    try {
      await listsApi.remove(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      showToast('Lista eliminada', 'success');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">
          <FormattedMessage id="listas.title" defaultMessage="Mis listas" />
        </h1>
        <Link to="/listas/nueva">
          <Button size="sm" variant="primary">
            <Plus size={16} />
            <FormattedMessage id="listas.new" defaultMessage="Nueva lista" />
          </Button>
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-parchment-300">Cargando…</p>
      ) : lists.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ScrollText size={32} className="text-parchment-300/40" />
            <p className="text-sm text-parchment-300">
              <FormattedMessage
                id="listas.empty"
                defaultMessage="No tenés listas todavía. Armá tu primer ejército."
              />
            </p>
            <Link to="/listas/nueva">
              <Button variant="primary" size="sm">
                <Plus size={16} /> {formatMessage({ id: 'listas.new' })}
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Card>
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/listas/${l.id}`} className="flex-1">
                    <p className="font-serif text-lg text-parchment-50">{l.name}</p>
                    <p className="text-xs text-parchment-300">
                      {l.faction} · {l.totalPoints} pts · {new Date(l.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                  <button
                    onClick={() => remove(l.id)}
                    className="touch-target flex items-center justify-center rounded-full p-2 text-blood-400 hover:bg-forge-2"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
