/**
 * Card de una crónica en la galería.
 *
 * Muestra la primera foto si hay, el título, el autor (solo si es de otro) y
 * un extracto del relato. El detalle completo vive en /cronicas/:id.
 */
import { Link } from 'react-router-dom';
import { Images, Lock, Globe, Sparkles } from 'lucide-react';

import { Card } from '../ui/Card.js';
import { fotoUrl } from '../../lib/cronicas-api.js';
import type { Cronica } from '@dobleuno/shared';

const EXTRACTO_CHARS = 180;

export interface CronicaCardProps {
  cronica: Cronica;
  /** true si la crónica es del usuario logueado. */
  esMia: boolean;
}

export function CronicaCard({ cronica, esMia }: CronicaCardProps) {
  const portada = cronica.fotos?.[0];
  const extracto = cronica.texto
    ? quitarAnclas(cronica.texto).slice(0, EXTRACTO_CHARS).trimEnd()
    : null;

  return (
    <Card>
      <Link to={`/cronicas/${cronica.id}`} className="block">
        {portada ? (
          <img
            src={fotoUrl(portada)}
            alt=""
            loading="lazy"
            className="mb-3 h-40 w-full rounded-lg object-cover"
          />
        ) : null}

        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg leading-tight text-parchment-50">{cronica.titulo}</h3>
          {esMia ? (
            cronica.visibilidad === 'publica' ? (
              <Globe size={14} className="mt-1 shrink-0 text-bronze-400" aria-label="Pública" />
            ) : (
              <Lock size={14} className="mt-1 shrink-0 text-parchment-300/60" aria-label="Privada" />
            )
          ) : null}
        </div>

        {!esMia && cronica.autorNombre ? (
          <p className="mt-0.5 text-xs text-parchment-300">por {cronica.autorNombre}</p>
        ) : null}

        {extracto ? (
          <p className="mt-2 text-sm leading-relaxed text-parchment-200">{extracto}…</p>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-parchment-300">
            <Sparkles size={12} /> Sin relato todavía
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-parchment-300">
          {cronica.fotos && cronica.fotos.length > 0 ? (
            <span className="flex items-center gap-1">
              <Images size={12} /> {cronica.fotos.length}
            </span>
          ) : null}
          {cronica.warnings.length > 0 ? (
            <span className="text-bronze-400">· {cronica.warnings.length} aviso(s)</span>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}

/** Los marcadores `[u:N]`/`[h:N]` son metadata, no texto para el lector. */
export function quitarAnclas(texto: string): string {
  return texto.replace(/\[(?:u|h):\d+\]/g, '').replace(/ {2,}/g, ' ').replace(/ +([.,;])/g, '$1');
}
