import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { X } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { Sigil } from '../Sigil.js';

/**
 * ClubBanner — banner compacto sticky debajo del header.
 *
 * Una sola línea con el nombre del club + horarios + un botón "Info".
 * Click → modal expandido con info completa + CTA "Editar" si sos admin.
 *
 * Mobile-first: ahorra espacio vertical, expand on demand.
 */

interface ClubInfo {
  nombre: string;
  descripcion?: string | null;
  direccion?: string | null;
  horarios?: string | null;
  contactoEmail?: string | null;
  contactoWhatsapp?: string | null;
  discord?: string | null;
  redes?: Record<string, string>;
}

interface ClubBannerProps {
  info: ClubInfo | null;
  isAdmin: boolean;
  onEdit?: () => void;
}

export function ClubBanner({ info, isAdmin, onEdit }: ClubBannerProps) {
  const [open, setOpen] = useState(false);
  const { formatMessage } = useIntl();

  const resumen = info
    ? [
        info.nombre,
        info.horarios ? `🕒 ${info.horarios}` : null,
        info.direccion ? `📍 ${info.direccion}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : formatMessage({ id: 'club.loading', defaultMessage: 'Cargando info del club…' });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'sticky top-12 z-20 flex w-full items-center justify-between gap-2',
          'border-b border-forge-3 bg-forge-1/95 px-4 py-1.5 backdrop-blur',
          'text-left text-xs text-parchment-300 transition-colors',
          'hover:bg-forge-2 hover:text-parchment-100',
        )}
      >
        <span className="truncate">
          <Sigil size="mini" className="mr-2 inline-block align-middle" />
          {resumen}
        </span>
        <span className="shrink-0 text-bronze-400">
          <FormattedMessage id="club.more" defaultMessage="Ver más" />
        </span>
      </button>

      {open && (
        <ClubInfoModal info={info} isAdmin={isAdmin} onEdit={onEdit} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

interface ClubInfoModalProps {
  info: ClubInfo | null;
  isAdmin: boolean;
  onEdit?: () => void;
  onClose: () => void;
}

function ClubInfoModal({ info, isAdmin, onEdit, onClose }: ClubInfoModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-forge-3 bg-forge-1 p-6 shadow-lifted sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between">
          <h2 className="font-serif text-2xl text-parchment-50">{info?.nombre ?? '—'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target -m-2 p-2 text-parchment-300 hover:text-parchment-50"
            aria-label={/* @intl */ 'Cerrar'}
          >
            <X size={20} />
          </button>
        </header>

        {info?.descripcion && (
          <p className="mb-4 text-sm text-parchment-200">{info.descripcion}</p>
        )}

        <dl className="space-y-2 text-sm">
          {info?.direccion && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-parchment-400">Dirección</dt>
              <dd className="text-parchment-100">{info.direccion}</dd>
            </div>
          )}
          {info?.horarios && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-parchment-400">Horarios</dt>
              <dd className="text-parchment-100">{info.horarios}</dd>
            </div>
          )}
          {info?.contactoEmail && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-parchment-400">Email</dt>
              <dd>
                <a
                  href={`mailto:${info.contactoEmail}`}
                  className="text-bronze-400 underline-offset-4 hover:underline"
                >
                  {info.contactoEmail}
                </a>
              </dd>
            </div>
          )}
          {info?.contactoWhatsapp && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-parchment-400">WhatsApp</dt>
              <dd>
                <a
                  href={`https://wa.me/${info.contactoWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener"
                  className="text-bronze-400 underline-offset-4 hover:underline"
                >
                  {info.contactoWhatsapp}
                </a>
              </dd>
            </div>
          )}
          {info?.discord && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-parchment-400">Discord</dt>
              <dd>
                <a
                  href={info.discord}
                  target="_blank"
                  rel="noopener"
                  className="text-bronze-400 underline-offset-4 hover:underline"
                >
                  {info.discord}
                </a>
              </dd>
            </div>
          )}
          {info?.redes && Object.keys(info.redes).length > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-parchment-400">Redes</dt>
              <dd className="flex flex-wrap gap-2">
                {Object.entries(info.redes).map(([k, v]) => (
                  <a
                    key={k}
                    href={v}
                    target="_blank"
                    rel="noopener"
                    className="text-bronze-400 underline-offset-4 hover:underline"
                  >
                    {k}
                  </a>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {isAdmin && onEdit && (
          <button
            type="button"
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="mt-6 w-full rounded-lg bg-blood-500 px-4 py-2.5 text-sm font-medium text-parchment-50 hover:bg-blood-400"
          >
            <FormattedMessage id="club.edit" defaultMessage="Editar info del club" />
          </button>
        )}
      </div>
    </div>
  );
}