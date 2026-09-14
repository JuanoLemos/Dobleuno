/**
 * AvisoDeCache — por qué lo que se está viendo no vino del server.
 *
 * Son tres causas distintas y el usuario puede hacer algo distinto con cada
 * una: sin red, esperar; con el server caído o sin base, avisarle a quien lo
 * administra. Un "sin conexión" genérico manda a revisar el router al que
 * tiene wifi.
 */
import { Database, ServerOff, WifiOff } from 'lucide-react';

import type { MotivoDeCache } from '../../lib/codex-api.js';

interface AvisoDeCacheProps {
  motivo?: MotivoDeCache;
  /** Cuántas entradas se pudieron servir desde la cache local. */
  enCache: number;
}

const ICONO = {
  'sin-red': WifiOff,
  'server-caido': ServerOff,
  'server-sin-datos': Database,
} as const;

export function AvisoDeCache({ motivo, enCache }: AvisoDeCacheProps) {
  if (!motivo) return null;

  const Icono = ICONO[motivo];
  const guardado = enCache > 0 ? ' — mostrando lo que tenés guardado' : '';
  const texto =
    motivo === 'sin-red'
      ? `Sin conexión${guardado || ', y todavía no hay nada guardado en este dispositivo'}`
      : motivo === 'server-caido'
        ? `No se pudo contactar al servidor${guardado}`
        : `El servidor no tiene el corpus cargado${guardado}`;

  return (
    <p className="codex-no-print mb-4 flex items-center gap-2 text-xs codex-muted">
      <Icono size={12} /> {texto}
    </p>
  );
}
