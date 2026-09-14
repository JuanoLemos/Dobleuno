import { CalendarDays } from 'lucide-react';
import { FormattedMessage } from 'react-intl';
import { Card } from '../components/ui/Card.js';
import { SesionCard } from '../components/mesas/SesionCard.js';
import { MesasAdmin } from '../components/mesas/MesasAdmin.js';
import { authClient } from '../lib/auth-client.js';
import { mesasApi, sesionesApi, type Mesa, type Sesion } from '../lib/mesas-api.js';
import { reservasApi, type MiReserva } from '../lib/reservas-api.js';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.js';
import { useUIStore } from '../lib/store.js';
import { Plus } from 'lucide-react';

/**
 * Mesas — Vista principal del calendar (Ola 9, Día 3).
 *
 * - Lista de sesiones futuras agrupadas por semana.
 * - Cada SesionCard muestra mesa, fecha, formato, cupos, y permite reservar/cancelar.
 * - Si el user es admin: FAB para crear nueva sesión.
 * - Si no hay sesiones: empty state.
 *
 * Mobile-first: scroll vertical, una card por línea.
 */

type GrupoSemana = {
  label: string;
  sesiones: Sesion[];
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day; // arranca lunes
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date, now: Date): string {
  const thisWeek = startOfWeek(now);
  const nextWeek = new Date(thisWeek);
  nextWeek.setDate(nextWeek.getDate() + 7);
  if (weekStart.getTime() === thisWeek.getTime()) return 'Esta semana';
  if (weekStart.getTime() === nextWeek.getTime()) return 'Próxima semana';
  // ej: "Semana del 22 jul"
  return `Semana del ${weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
}

function agruparPorSemana(sesiones: Sesion[]): GrupoSemana[] {
  const grupos = new Map<string, GrupoSemana>();
  const now = new Date();
  for (const s of sesiones) {
    const fecha = new Date(s.fecha);
    const ws = startOfWeek(fecha);
    const key = ws.toISOString().slice(0, 10);
    if (!grupos.has(key)) {
      grupos.set(key, {
        label: formatWeekLabel(ws, now),
        sesiones: [],
      });
    }
    grupos.get(key)!.sesiones.push(s);
  }
  // Ordenar por key (cronológico).
  return Array.from(grupos.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, g]) => g);
}

export function Mesas() {
  const session = authClient.useSession();
  const isLoggedIn = Boolean(session.data?.user);
  const isAdmin = Boolean((session.data?.user as { isAdmin?: boolean } | undefined)?.isAdmin);

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [misReservas, setMisReservas] = useState<MiReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  async function loadAll(): Promise<void> {
    setLoading(true);
    try {
      const [mesasData, sesionesData] = await Promise.all([
        mesasApi.list(),
        sesionesApi.list(),
      ]);
      setMesas(mesasData);
      setSesiones(sesionesData);
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadMisReservas(): Promise<void> {
    if (!isLoggedIn) {
      setMisReservas([]);
      return;
    }
    try {
      const data = await reservasApi.misReservas();
      setMisReservas(data);
    } catch {
      // Silencioso: si falla, asumimos que no hay reservas.
      setMisReservas([]);
    }
  }

  useEffect(() => {
    void loadAll();
    void loadMisReservas();
    // Deps intencionales: solo re-fetch cuando cambia el estado de sesión.
  }, [isLoggedIn]);

  const mesasById = useMemo(() => {
    const m = new Map<string, Mesa>();
    for (const mesa of mesas) m.set(mesa.id, mesa);
    return m;
  }, [mesas]);

  const misReservaPorSesion = useMemo(() => {
    const m = new Map<string, MiReserva>();
    for (const r of misReservas) m.set(r.sesion.id, r);
    return m;
  }, [misReservas]);

  const grupos = useMemo(() => agruparPorSemana(sesiones), [sesiones]);

  async function handleReservar(sesionId: string): Promise<void> {
    try {
      await reservasApi.create(sesionId, {});
      showToast('Reserva confirmada', 'success');
      await loadMisReservas();
      // El componente SesionCard recarga por su cuenta vía prop.
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  async function handleCancelar(sesionId: string, reservaId: string): Promise<void> {
    if (!window.confirm('¿Cancelar tu reserva?')) return;
    try {
      await reservasApi.cancel(sesionId, reservaId);
      showToast('Reserva cancelada', 'success');
      await loadMisReservas();
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-parchment-300">Cargando sesiones…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-bronze-400" />
          <h1 className="font-serif text-2xl">
            <FormattedMessage id="mesas.title" defaultMessage="Mesas" />
          </h1>
        </div>
        {isAdmin && (
          <Button size="sm" variant="primary" onClick={() => setShowAdmin(true)}>
            <Plus size={16} />
            Admin
          </Button>
        )}
      </header>

      {!isLoggedIn && sesiones.length > 0 && (
        <Card>
          <p className="text-sm text-parchment-200">
            <Link to="/login" className="text-bronze-400 underline-offset-4 hover:underline">
              Ingresá
            </Link>{' '}
            para reservar una plaza.
          </p>
        </Card>
      )}

      {sesiones.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CalendarDays size={32} className="text-parchment-300/40" />
            <p className="text-sm text-parchment-300">
              <FormattedMessage
                id="mesas.empty"
                defaultMessage="No hay sesiones publicadas todavía. Pedile al admin que publique una."
              />
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => (
            <section key={grupo.label}>
              <h2 className="mb-2 font-serif text-lg text-bronze-400">{grupo.label}</h2>
              <ul className="flex flex-col gap-2">
                {grupo.sesiones.map((s) => (
                  <li key={s.id}>
                    <SesionCard
                      sesion={s}
                      mesa={mesasById.get(s.mesaId) ?? null}
                      miReserva={misReservaPorSesion.get(s.id) ?? null}
                      isLoggedIn={isLoggedIn}
                      onReservar={() => handleReservar(s.id)}
                      onCancelar={(rid) => handleCancelar(s.id, rid)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {showAdmin && isAdmin && (
        <MesasAdmin
          mesas={mesas}
          sesiones={sesiones}
          onClose={() => setShowAdmin(false)}
          onChanged={() => {
            void loadAll();
          }}
        />
      )}
    </div>
  );
}