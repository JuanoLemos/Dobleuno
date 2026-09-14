/**
 * Cliente: galería de crónicas — Ola 10.
 *
 * Muestra las propias y las que el club publicó, con un filtro entre las dos.
 * El detalle de cada una vive en /cronicas/:id.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Images } from 'lucide-react';

import { Card } from '../components/ui/Card.js';
import { CronicaCard } from '../components/cronicas/CronicaCard.js';
import { cronicasApi } from '../lib/cronicas-api.js';
import { authClient } from '../lib/auth-client.js';
import { useUIStore } from '../lib/store.js';
import type { Cronica } from '@dobleuno/shared';

type Filtro = 'mias' | 'club';

export function Cronicas() {
  const [cronicas, setCronicas] = useState<Cronica[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('mias');
  const [loading, setLoading] = useState(true);
  const showToast = useUIStore((s) => s.showToast);
  const session = authClient.useSession();
  const userId = session.data?.user?.id;
  const isLoggedIn = Boolean(userId);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn) {
      setCronicas([]);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const data = await cronicasApi.list();
        if (!cancelled) setCronicas(data);
      } catch (err) {
        if (!cancelled) {
          setCronicas([]);
          showToast('Error: ' + (err as Error).message, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const mias = cronicas.filter((c) => c.userId === userId);
  const delClub = cronicas.filter((c) => c.userId !== userId);
  const visibles = filtro === 'mias' ? mias : delClub;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex items-center gap-2">
        <Images size={22} className="text-bronze-400" />
        <h1 className="font-serif text-2xl">
          <FormattedMessage id="cronicas.title" defaultMessage="Crónicas" />
        </h1>
      </header>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-parchment-300">Cargando…</p>
        </div>
      ) : !isLoggedIn ? (
        <Card>
          <p className="text-sm text-parchment-200">
            <Link to="/login" className="text-bronze-400 underline-offset-4 hover:underline">
              Ingresá
            </Link>{' '}
            para escribir la crónica de tus partidas.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-4 border-b border-parchment-300/20 text-sm">
            <FiltroTab activo={filtro === 'mias'} onClick={() => setFiltro('mias')}>
              Mías ({mias.length})
            </FiltroTab>
            <FiltroTab activo={filtro === 'club'} onClick={() => setFiltro('club')}>
              Del club ({delClub.length})
            </FiltroTab>
          </div>

          {visibles.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Images size={32} className="text-parchment-300/40" />
                <p className="text-sm text-parchment-300">
                  {filtro === 'mias' ? (
                    <FormattedMessage
                      id="cronicas.empty"
                      defaultMessage="Todavía no escribiste ninguna crónica. Terminá una batalla y generala desde ahí."
                    />
                  ) : (
                    <FormattedMessage
                      id="cronicas.empty.club"
                      defaultMessage="Nadie publicó una crónica todavía."
                    />
                  )}
                </p>
                {filtro === 'mias' ? (
                  <Link to="/batalla" className="text-sm text-bronze-400 underline-offset-4 hover:underline">
                    Ver mis batallas
                  </Link>
                ) : null}
              </div>
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibles.map((c) => (
                <li key={c.id}>
                  <CronicaCard cronica={c} esMia={c.userId === userId} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FiltroTab({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`touch-target border-b-2 px-1 pb-2 transition-colors ${
        activo
          ? 'border-blood-400 text-blood-400'
          : 'border-transparent text-parchment-300 hover:text-parchment-100'
      }`}
    >
      {children}
    </button>
  );
}
