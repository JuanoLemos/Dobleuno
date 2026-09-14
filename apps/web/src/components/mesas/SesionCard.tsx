import { useState } from 'react';
import { Calendar, Users, MapPin, MessageSquare } from 'lucide-react';

import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import type { Mesa, Sesion } from '../../lib/mesas-api.js';
import type { MiReserva } from '../../lib/reservas-api.js';
import { reservasApi } from '../../lib/reservas-api.js';

interface SesionCardProps {
  sesion: Sesion;
  mesa: Mesa | null;
  miReserva: MiReserva | null;
  isLoggedIn: boolean;
  onReservar: () => void | Promise<void>;
  onCancelar: (reservaId: string) => void | Promise<void>;
  /** Cantidad de anotados en la sesión (lo trae Mesas.tsx). */
  anotados?: number;
  /** Si el botón "Reservar" debe estar deshabilitado por estar llena. */
  llena?: boolean;
  /** Si el botón "Reservar" debe estar deshabilitado por ya tener reserva. */
  yaReservado?: boolean;
}

/**
 * SesionCard — card de una sesión en la lista del calendar.
 *
 * Muestra: fecha/hora AR, mesa, formato, cupos, notas.
 * Acciones: reservar (auth required) o cancelar (si ya tengo reserva).
 *
 * Mobile-first: full-width, scroll vertical.
 */
export function SesionCard({
  sesion,
  mesa,
  miReserva,
  isLoggedIn,
  onReservar,
  onCancelar,
}: SesionCardProps) {
  const [reservadosCount, setReservadosCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Traemos el count de reservas solo si no lo pasan.
  async function loadCount(): Promise<void> {
    if (reservadosCount !== null) return;
    setLoadingCount(true);
    try {
      const list = await reservasApi.list(sesion.id);
      setReservadosCount(list.length);
    } catch {
      setReservadosCount(0);
    } finally {
      setLoadingCount(false);
    }
  }

  const capacidad = mesa?.capacidad ?? 0;
  const llenos = capacidad > 0 && reservadosCount !== null && reservadosCount >= capacidad;

  // Trigger lazy load al mount.
  useState(() => {
    void loadCount();
  });

  const fechaAR = new Date(sesion.fecha).toLocaleString('es-AR', {
    timeZone: 'America/Buenos_Aires',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card texture="iron">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg text-parchment-50">
              {mesa?.nombre ?? 'Mesa'}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-bronze-400">
              <Calendar size={12} />
              {fechaAR}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-parchment-300">
              <span className="rounded-full bg-forge-2 px-2 py-0.5">
                {sesion.formato === 'open' ? 'Open' : `${sesion.formato} pts`}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {loadingCount
                  ? '…'
                  : reservadosCount !== null
                    ? `${reservadosCount}/${capacidad}`
                    : `0/${capacidad}`}
              </span>
            </div>
            {sesion.notas && (
              <p className="mt-2 flex items-start gap-1 text-xs text-parchment-300">
                <MessageSquare size={12} className="mt-0.5 shrink-0" />
                <span>{sesion.notas}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {miReserva ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCancelar(miReserva.reserva.id)}
              >
                Cancelar reserva
              </Button>
            ) : isLoggedIn ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onReservar}
                disabled={llenos}
                title={llenos ? 'Sesión completa' : undefined}
              >
                {llenos ? 'Completa' : 'Reservar'}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" disabled>
                <MapPin size={12} />
                Ingresá para reservar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}