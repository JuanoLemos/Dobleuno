/**
 * Cliente: BattleEdit — el tracker de batalla en vivo.
 * Setup, phase bar, unit state, save, post-game.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Swords, Sparkles, Trophy } from 'lucide-react';

import { PhaseBar } from '../components/batalla/PhaseBar.js';
import { UnitStateCard } from '../components/batalla/UnitStateCard.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { battlesApi } from '../lib/battles-api.js';
import { listsApi } from '../lib/lists-api.js';
import { PHASE_LABELS, PHASE_DESCRIPTIONS, makeLog, nextPhase } from '../lib/battle-engine.js';
import { useUIStore } from '../lib/store.js';
import type { BattleState, BattleUnit, GamePhase } from '@dobleuno/shared';

export function BattleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'nueva' || !id;
  const [battle, setBattle] = useState<BattleState | null>(isNew ? null : null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showSetup, setShowSetup] = useState(isNew);
  const [myLists, setMyLists] = useState<Array<{ id: string; name: string; faction: string }>>([]);
  const showToast = useUIStore((s) => s.showToast);

  // Cargar mis listas
  useEffect(() => {
    void (async () => {
      try {
        const res = await listsApi.list();
        setMyLists(res.lists ?? []);
      } catch {
        setMyLists([]);
      }
    })();
  }, []);

  // Cargar batalla existente
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await battlesApi.get(id);
        if (!cancelled) {
          setBattle(res.data);
          setShowSetup(false);
        }
      } catch {
        if (!cancelled) showToast('Error cargando batalla', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  async function startBattle(input: { name: string; playerListId: string; opponentArmySummary: string }): Promise<void> {
    setSaving(true);
    try {
      const res = await battlesApi.create(input);
      setBattle(res.battle.data);
      setShowSetup(false);
      navigate(`/batalla/${res.battle.id}`);
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveBattle(): Promise<void> {
    if (!battle) return;
    setSaving(true);
    try {
      await battlesApi.update(battle.id, battle);
      showToast('Batalla guardada', 'success');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    if (!battle) return null;
    return {
      totalModels: battle.units.reduce((s, u) => s + u.modelsCurrent, 0),
      playerModels: battle.units.filter((u) => u.faction === 'player').reduce((s, u) => s + u.modelsCurrent, 0),
      opponentModels: battle.units.filter((u) => u.faction === 'opponent').reduce((s, u) => s + u.modelsCurrent, 0),
    };
  }, [battle]);

  if (loading) return <p className="text-sm text-parchment-300">Cargando…</p>;

  if (showSetup || !battle) {
    return <SetupPanel myLists={myLists} onStart={startBattle} saving={saving} />;
  }

  function changePhase(p: GamePhase): void {
    if (!battle) return;
    const log = battle.phase !== p ? [makeLog(battle.turn, p, `Cambio a fase ${PHASE_LABELS[p]}`, 'system'), ...battle.log] : battle.log;
    setBattle({ ...battle, phase: p, log });
  }

  function advancePhase(): void {
    if (!battle) return;
    const next = nextPhase(battle.phase);
    const newTurn = next === 'start' ? battle.turn + 1 : battle.turn;
    setBattle({
      ...battle,
      phase: next,
      turn: newTurn,
      log: [makeLog(newTurn, next, `Avance a ${PHASE_LABELS[next]} (turno ${newTurn + 1})`, 'system'), ...battle.log],
    });
  }

  function updateUnit(u: BattleUnit): void {
    if (!battle) return;
    setBattle({ ...battle, units: battle.units.map((x) => (x.id === u.id ? u : x)) });
  }

  function endBattle(winner: 'player' | 'opponent' | 'draw'): void {
    if (!battle) return;
    setBattle({
      ...battle,
      status: 'finished',
      winner,
      finishedAt: new Date().toISOString(),
      log: [makeLog(battle.turn, battle.phase, `Batalla terminada. Ganador: ${winner}`, 'system'), ...battle.log],
    });
    showToast(`Batalla terminada. Ganador: ${winner}`, 'success');
  }

  return (
    <div className="flex flex-col gap-3 pb-20 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/batalla">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} /> Batallas
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-lg leading-tight">{battle.name}</h1>
          <p className="text-xs text-parchment-300">
            {battle.scenario} · {stats?.totalModels ?? 0} modelos en mesa
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={saveBattle} loading={saving}>
          <Save size={14} /> Guardar
        </Button>
      </div>

      <PhaseBar current={battle.phase} turn={battle.turn} onChange={changePhase} />

      <Card>
        <h3 className="mb-1 text-xs uppercase tracking-widest text-parchment-300">
          {PHASE_LABELS[battle.phase]}
        </h3>
        <p className="text-sm text-parchment-200">{PHASE_DESCRIPTIONS[battle.phase]}</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={advancePhase}>
            <Sparkles size={12} /> Siguiente fase
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <Card>
          <p className="text-parchment-300">Mis modelos</p>
          <p className="font-serif text-2xl text-bronze-400">{stats?.playerModels ?? 0}</p>
        </Card>
        <Card>
          <p className="text-parchment-300">Rival</p>
          <p className="font-serif text-2xl text-blood-400">{stats?.opponentModels ?? 0}</p>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-parchment-300">
          Mis unidades ({battle.units.filter((u) => u.faction === 'player').length})
        </h2>
        {battle.units
          .filter((u) => u.faction === 'player')
          .map((u) => (
            <UnitStateCard key={u.id} unit={u} onUpdate={updateUnit} onRemove={() => {}} />
          ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-parchment-300">
          Unidades rivales ({battle.units.filter((u) => u.faction === 'opponent').length})
        </h2>
        {battle.units
          .filter((u) => u.faction === 'opponent')
          .map((u) => (
            <UnitStateCard key={u.id} unit={u} onUpdate={updateUnit} onRemove={() => {}} />
          ))}
      </section>

      {battle.status !== 'finished' && (
        <Card>
          <h3 className="mb-2 text-xs uppercase tracking-widest text-parchment-300">
            Terminar batalla
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="primary" onClick={() => endBattle('player')}>
              <Trophy size={12} /> Victoria
            </Button>
            <Button size="sm" variant="secondary" onClick={() => endBattle('draw')}>
              <Swords size={12} /> Empate
            </Button>
            <Button size="sm" variant="danger" onClick={() => endBattle('opponent')}>
              Derrota
            </Button>
          </div>
        </Card>
      )}

      {battle.status === 'finished' && (
        <Card>
          <h3 className="mb-1 text-xs uppercase tracking-widest text-bronze-400">
            Resultado
          </h3>
          <p className="font-serif text-2xl">
            {battle.winner === 'player' ? 'Victoria' : battle.winner === 'opponent' ? 'Derrota' : 'Empate'}
          </p>
          {battle.finishedAt && (
            <p className="mt-1 text-xs text-parchment-300">
              {new Date(battle.finishedAt).toLocaleString()}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

interface SetupPanelProps {
  myLists: Array<{ id: string; name: string; faction: string }>;
  onStart: (input: { name: string; playerListId: string; opponentArmySummary: string }) => Promise<void>;
  saving: boolean;
}

function SetupPanel({ myLists, onStart, saving }: SetupPanelProps) {
  const [name, setName] = useState('Nueva batalla');
  const [listId, setListId] = useState(myLists[0]?.id ?? '');
  const [opponent, setOpponent] = useState('');

  useEffect(() => {
    if (!listId && myLists[0]) setListId(myLists[0].id);
  }, [myLists, listId]);

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <Link to="/batalla">
        <Button variant="ghost" size="sm">
          <ArrowLeft size={16} /> Batallas
        </Button>
      </Link>
      <h1 className="font-serif text-2xl">Nueva batalla</h1>

      <Card>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase text-parchment-300">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border border-forge-3 bg-forge-2 px-3 text-parchment-50 focus:border-blood-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-parchment-300">Mi ejército</label>
            {myLists.length === 0 ? (
              <p className="text-sm text-blood-300">
                No tenés listas. <Link to="/listas/nueva" className="underline">Creá una</Link> primero.
              </p>
            ) : (
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="h-11 w-full rounded-xl border border-forge-3 bg-forge-2 px-3 text-parchment-50 focus:border-blood-500 focus:outline-none"
              >
                {myLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.faction})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-parchment-300">
              Ejército rival (resumen)
            </label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="ej: Bretonnia Knights + Trebuchet"
              className="h-11 w-full rounded-xl border border-forge-3 bg-forge-2 px-3 text-parchment-50 focus:border-blood-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            disabled={!listId || !opponent.trim()}
            loading={saving}
            onClick={() => onStart({ name, playerListId: listId, opponentArmySummary: opponent })}
          >
            <Swords size={16} /> Empezar batalla
          </Button>
        </div>
      </Card>
    </div>
  );
}
