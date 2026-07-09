/**
 * ListaEdit route — editor de lista (nueva o existente).
 * Wrapper de ArmyEditor.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { List, FactionId } from '@dobleuno/shared';

import { ArmyEditor } from '../components/listas/ArmyEditor.js';
import { listsApi } from '../lib/lists-api.js';
import { Button } from '../components/ui/Button.js';

function newList(faction: FactionId): List {
  return {
    id: 'new',
    userId: 'dev-user-1',
    name: 'Nueva lista',
    faction,
    totalPoints: 0,
    units: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function ListaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'nueva' || !id;
  const [list, setList] = useState<List | null>(isNew ? newList('empire') : null);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await listsApi.get(id);
        if (!cancelled) setList(res.list.data);
      } catch {
        if (!cancelled) setList(newList('empire'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  if (loading) {
    return <p className="text-sm text-parchment-300">Cargando…</p>;
  }
  if (!list) return null;

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/listas')}>
          <ArrowLeft size={16} /> Listas
        </Button>
        {isNew && (
          <div className="ml-auto flex gap-1 text-xs">
            {(['empire', 'bretonnia'] as FactionId[]).map((f) => (
              <button
                key={f}
                onClick={() => setList(newList(f))}
                className={`rounded-full px-3 py-1 ${
                  list.faction === f ? 'bg-blood-500 text-parchment-50' : 'bg-forge-2 text-parchment-300'
                }`}
              >
                {f === 'empire' ? 'Imperio' : 'Bretonia'}
              </button>
            ))}
          </div>
        )}
      </div>

      <ArmyEditor
        initialList={list}
        onSaved={(newId) => navigate(`/listas/${newId}`)}
      />
    </div>
  );
}
