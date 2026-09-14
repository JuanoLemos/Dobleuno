import { useState } from 'react';
import { Plus, Trash2, Edit3, X, Calendar, Users } from 'lucide-react';

import { Button } from '../ui/Button.js';
import { Card } from '../ui/Card.js';
import { mesasApi, sesionesApi, type Mesa, type Sesion, type NewSesion, type NewMesa, type UpdateMesa, type UpdateSesion } from '../../lib/mesas-api.js';
import { useUIStore } from '../../lib/store.js';
import { cn } from '../../lib/cn.js';

interface MesasAdminProps {
  mesas: Mesa[];
  sesiones: Sesion[];
  onClose: () => void;
  onChanged: () => void;
}

type Tab = 'sesiones' | 'mesas';

/**
 * MesasAdmin — modal admin para gestionar sesiones y mesas.
 *
 * Tabs:
 *   - Sesiones: lista + crear/editar/eliminar.
 *   - Mesas: lista + crear/editar/soft-delete.
 *
 * Móvil-first: fullscreen modal en mobile, centrado en desktop.
 */
export function MesasAdmin({ mesas, sesiones, onClose, onChanged }: MesasAdminProps) {
  const [tab, setTab] = useState<Tab>('sesiones');
  const [sesionEdit, setSesionEdit] = useState<Sesion | null>(null);
  const [sesionNew, setSesionNew] = useState(false);
  const [mesaEdit, setMesaEdit] = useState<Mesa | null>(null);
  const [mesaNew, setMesaNew] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  async function handleDeleteSesion(id: string): Promise<void> {
    if (!window.confirm('¿Borrar esta sesión? Se perderán las reservas asociadas.')) return;
    try {
      await sesionesApi.remove(id);
      showToast('Sesión eliminada', 'success');
      onChanged();
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  async function handleDeleteMesa(id: string): Promise<void> {
    if (!window.confirm('¿Desactivar esta mesa? No se podrán crear nuevas sesiones.')) return;
    try {
      await mesasApi.remove(id);
      showToast('Mesa desactivada', 'success');
      onChanged();
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={cn(
          'flex w-full max-w-2xl flex-col rounded-t-2xl border border-forge-3 bg-forge-1 shadow-lifted sm:rounded-2xl',
          'max-h-[90dvh] overflow-hidden',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-forge-3 px-4 py-3">
          <h2 className="font-serif text-xl text-parchment-50">Admin · Mesas</h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target -m-2 p-2 text-parchment-300 hover:text-parchment-50"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-forge-3">
          <button
            type="button"
            onClick={() => setTab('sesiones')}
            className={cn(
              'flex-1 px-4 py-2.5 text-sm transition-colors',
              tab === 'sesiones'
                ? 'border-b-2 border-blood-400 text-blood-400'
                : 'text-parchment-300 hover:text-parchment-100',
            )}
          >
            <Calendar size={14} className="mr-1 inline-block" />
            Sesiones ({sesiones.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('mesas')}
            className={cn(
              'flex-1 px-4 py-2.5 text-sm transition-colors',
              tab === 'mesas'
                ? 'border-b-2 border-blood-400 text-blood-400'
                : 'text-parchment-300 hover:text-parchment-100',
            )}
          >
            <Users size={14} className="mr-1 inline-block" />
            Mesas ({mesas.length})
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'sesiones' ? (
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSesionEdit(null);
                  setSesionNew(true);
                }}
              >
                <Plus size={16} />
                Nueva sesión
              </Button>
              {sesiones.length === 0 ? (
                <Card>
                  <p className="py-4 text-center text-sm text-parchment-300">
                    No hay sesiones. Creá la primera arriba.
                  </p>
                </Card>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sesiones.map((s) => (
                    <li key={s.id}>
                      <Card>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-serif text-base text-parchment-50">
                              {mesas.find((m) => m.id === s.mesaId)?.nombre ?? 'Mesa'}
                            </p>
                            <p className="text-xs text-parchment-300">
                              {new Date(s.fecha).toLocaleString('es-AR', {
                                timeZone: 'America/Buenos_Aires',
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              · {s.formato === 'open' ? 'Open' : `${s.formato} pts`}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSesionEdit(s);
                                setSesionNew(false);
                              }}
                              className="touch-target rounded-full p-2 text-parchment-300 hover:bg-forge-2"
                              aria-label="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSesion(s.id)}
                              className="touch-target rounded-full p-2 text-blood-400 hover:bg-forge-2"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setMesaEdit(null);
                  setMesaNew(true);
                }}
              >
                <Plus size={16} />
                Nueva mesa
              </Button>
              {mesas.length === 0 ? (
                <Card>
                  <p className="py-4 text-center text-sm text-parchment-300">
                    No hay mesas. Creá la primera arriba.
                  </p>
                </Card>
              ) : (
                <ul className="flex flex-col gap-2">
                  {mesas.map((m) => (
                    <li key={m.id}>
                      <Card>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-serif text-base text-parchment-50">{m.nombre}</p>
                            <p className="text-xs text-parchment-300">
                              Capacidad: {m.capacidad} jugadores
                              {m.activa ? '' : ' · desactivada'}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setMesaEdit(m);
                                setMesaNew(false);
                              }}
                              className="touch-target rounded-full p-2 text-parchment-300 hover:bg-forge-2"
                              aria-label="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMesa(m.id)}
                              className="touch-target rounded-full p-2 text-blood-400 hover:bg-forge-2"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {(sesionEdit || sesionNew) && (
        <SesionForm
          sesion={sesionEdit}
          mesas={mesas.filter((m) => m.activa)}
          onClose={() => {
            setSesionEdit(null);
            setSesionNew(false);
          }}
          onSaved={() => {
            setSesionEdit(null);
            setSesionNew(false);
            onChanged();
          }}
        />
      )}

      {(mesaEdit || mesaNew) && (
        <MesaForm
          mesa={mesaEdit}
          onClose={() => {
            setMesaEdit(null);
            setMesaNew(false);
          }}
          onSaved={() => {
            setMesaEdit(null);
            setMesaNew(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ─── SesionForm ───────────────────────────────────────────────────────────

interface SesionFormProps {
  sesion: Sesion | null;
  mesas: Mesa[];
  onClose: () => void;
  onSaved: () => void;
}

function SesionForm({ sesion, mesas, onClose, onSaved }: SesionFormProps) {
  const [mesaId, setMesaId] = useState(sesion?.mesaId ?? mesas[0]?.id ?? '');
  const [fechaLocal, setFechaLocal] = useState(() => {
    if (sesion) {
      // Convertir ISO UTC → datetime-local (AR) para el input.
      const d = new Date(sesion.fecha);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
      return local.toISOString().slice(0, 16);
    }
    // default: próximo sábado 14hs AR
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    d.setHours(14, 0, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  const [formato, setFormato] = useState<'2000' | '2500' | 'open'>(sesion?.formato ?? '2000');
  const [notas, setNotas] = useState(sesion?.notas ?? '');
  const [saving, setSaving] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  async function save(): Promise<void> {
    if (!mesaId || !fechaLocal) {
      showToast('Falta mesa o fecha', 'error');
      return;
    }
    setSaving(true);
    try {
      // datetime-local no tiene offset. Asumimos que el user escribió hora AR
      // (porque ve la app en es-AR), así que agregamos -03:00.
      const fechaIso = `${fechaLocal}:00-03:00`;
      const payload: NewSesion = {
        mesaId,
        fecha: fechaIso,
        formato,
        notas: notas || null,
      };
      if (sesion) {
        const update: UpdateSesion = {
          mesaId,
          fecha: fechaIso,
          formato,
          notas: notas || null,
        };
        await sesionesApi.update(sesion.id, update);
        showToast('Sesión actualizada', 'success');
      } else {
        await sesionesApi.create(payload);
        showToast('Sesión publicada', 'success');
      }
      onSaved();
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-t-2xl border border-forge-3 bg-forge-1 p-5 shadow-lifted sm:rounded-2xl',
          'max-h-[90dvh] overflow-y-auto',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-serif text-xl">
          {sesion ? 'Editar sesión' : 'Nueva sesión'}
        </h3>
        <div className="flex flex-col gap-3 text-sm">
          <label className="block">
            <span className="text-parchment-300">Mesa</span>
            <select
              value={mesaId}
              onChange={(e) => setMesaId(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
            >
              {mesas.length === 0 && <option value="">No hay mesas activas</option>}
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.capacidad})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-parchment-300">Fecha y hora (Argentina)</span>
            <input
              type="datetime-local"
              value={fechaLocal}
              onChange={(e) => setFechaLocal(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
            />
          </label>
          <label className="block">
            <span className="text-parchment-300">Formato</span>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value as '2000' | '2500' | 'open')}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
            >
              <option value="2000">2000 pts</option>
              <option value="2500">2500 pts</option>
              <option value="open">Open</option>
            </select>
          </label>
          <label className="block">
            <span className="text-parchment-300">Notas (opcional)</span>
            <textarea
              value={notas ?? ''}
              onChange={(e) => setNotas(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              rows={2}
              maxLength={500}
              placeholder="Traer reglamento impreso, escenario X, etc."
            />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" fullWidth onClick={save} loading={saving}>
            {sesion ? 'Guardar' : 'Publicar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── MesaForm ─────────────────────────────────────────────────────────────

interface MesaFormProps {
  mesa: Mesa | null;
  onClose: () => void;
  onSaved: () => void;
}

function MesaForm({ mesa, onClose, onSaved }: MesaFormProps) {
  const [nombre, setNombre] = useState(mesa?.nombre ?? '');
  const [capacidad, setCapacidad] = useState<2 | 4 | 6 | 8>(
    mesa?.capacidad ?? 4,
  );
  const [saving, setSaving] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  async function save(): Promise<void> {
    if (!nombre.trim()) {
      showToast('Falta nombre', 'error');
      return;
    }
    setSaving(true);
    try {
      if (mesa) {
        const update: UpdateMesa = { nombre: nombre.trim(), capacidad };
        await mesasApi.update(mesa.id, update);
        showToast('Mesa actualizada', 'success');
      } else {
        const payload: NewMesa = { nombre: nombre.trim(), capacidad };
        await mesasApi.create(payload);
        showToast('Mesa creada', 'success');
      }
      onSaved();
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-t-2xl border border-forge-3 bg-forge-1 p-5 shadow-lifted sm:rounded-2xl',
          'max-h-[90dvh] overflow-y-auto',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-serif text-xl">{mesa ? 'Editar mesa' : 'Nueva mesa'}</h3>
        <div className="flex flex-col gap-3 text-sm">
          <label className="block">
            <span className="text-parchment-300">Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              maxLength={80}
              placeholder="Mesa 1, Mesa grande, etc."
            />
          </label>
          <label className="block">
            <span className="text-parchment-300">Capacidad (jugadores)</span>
            <select
              value={capacidad}
              onChange={(e) => setCapacidad(Number(e.target.value) as 2 | 4 | 6 | 8)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
            >
              <option value={2}>2 jugadores (1v1)</option>
              <option value={4}>4 jugadores (2v2)</option>
              <option value={6}>6 jugadores</option>
              <option value={8}>8 jugadores</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" fullWidth onClick={save} loading={saving}>
            {mesa ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </div>
    </div>
  );
}