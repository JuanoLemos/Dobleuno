/**
 * Cliente: lista de batallas + CTA "Nueva".
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Plus, Swords, Trash2 } from 'lucide-react';

import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { battlesApi } from '../lib/battles-api.js';
import { useUIStore } from '../lib/store.js';
import { PHASE_LABELS } from '../lib/battle-engine.js';

export function Batalla() {
  const [battles, setBattles] = useState<Array<{ id: string; name: string; status: string; turn: number; phase: string }>>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await battlesApi.list();
        if (!cancelled) setBattles(res.battles ?? []);
      } catch {
        if (!cancelled) setBattles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string): Promise<void> {
    if (!window.confirm('¿Eliminar batalla?')) return;
    try {
      await battlesApi.remove(id);
      setBattles((prev) => prev.filter((b) => b.id !== id));
      showToast('Batalla eliminada', 'success');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">
          <FormattedMessage id="batalla.title" defaultMessage="Mis batallas" />
        </h1>
        <Link to="/batalla/nueva">
          <Button size="sm" variant="primary">
            <Plus size={16} />
            <FormattedMessage id="batalla.new" defaultMessage="Nueva batalla" />
          </Button>
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-parchment-300">Cargando…</p>
      ) : battles.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Swords size={32} className="text-parchment-300/40" />
            <p className="text-sm text-parchment-300">
              <FormattedMessage id="batalla.empty" defaultMessage="Sin batallas en curso." />
            </p>
            <Link to="/batalla/nueva">
              <Button variant="primary" size="sm">
                <Plus size={16} /> Empezar
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <ul className="space-y-2">
          {battles.map((b) => (
            <li key={b.id}>
              <Card>
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/batalla/${b.id}`} className="flex-1">
                    <p className="font-serif text-lg text-parchment-50">{b.name}</p>
                    <p className="text-xs text-parchment-300">
                      T{b.turn + 1} · {PHASE_LABELS[b.phase as keyof typeof PHASE_LABELS] ?? b.phase} · {b.status}
                    </p>
                  </Link>
                  <button
                    onClick={() => remove(b.id)}
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
