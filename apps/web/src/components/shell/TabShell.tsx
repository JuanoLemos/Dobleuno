import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Wifi, WifiOff, LogOut, Lock } from 'lucide-react';

import { Sigil } from '../Sigil.js';
import { ClubBanner } from './ClubBanner.js';
import { NavTabs } from './NavTabs.js';
import { Footer } from '../layout/Footer.js';
import { useUIStore } from '../../lib/store.js';
import { authClient } from '../../lib/auth-client.js';
import { cn } from '../../lib/cn.js';
import { clubApi, type ClubInfo } from '../../lib/club-api.js';

/**
 * TabShell — layout raíz para todas las rutas autenticadas y públicas.
 *
 * Estructura:
 *   ┌─────────────────────────────────────┐
 *   │ Header (Sigil + auth indicator)     │  sticky top-0
 *   ├─────────────────────────────────────┤
 *   │ ClubBanner (info del club)          │  sticky top-12 (compacto)
 *   ├─────────────────────────────────────┤
 *   │ NavTabs (Codex / Ejércitos)         │  sticky top-[7.5rem] (horizontal scroll)
 *   ├─────────────────────────────────────┤
 *   │ <Outlet /> — contenido del tab      │
 *   ├─────────────────────────────────────┤
 *   │ Footer                              │
 *   └─────────────────────────────────────┘
 *
 * Reemplaza al AppShell anterior (que tenía bottom-nav). El bottom-nav fue
 * eliminado en favor de tabs horizontales en header (mobile-first, decisión
 * del usuario en replan 2026-07-10).
 */
export function TabShell() {
  const online = useUIStore((s) => s.online);
  const session = authClient.useSession();
  const { formatMessage } = useIntl();

  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isLoggedIn = Boolean(session.data?.user);
  // better-auth no expone isAdmin en el type del user por default; lo casteamos.
  const isAdmin = Boolean((session.data?.user as { isAdmin?: boolean } | undefined)?.isAdmin);

  // Cargar info del club al mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await clubApi.get();
        if (!cancelled) setClubInfo(data);
      } catch (err) {
        console.warn('Failed to load club info', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-forge-0 text-parchment-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-forge-3 bg-forge-1/95 backdrop-blur pt-safe">
        <div className="flex h-12 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2">
            <Sigil size="mini" />
            <span className="font-serif text-lg">Dobleuno</span>
          </a>
          <div className="flex items-center gap-2 text-xs text-parchment-300">
            {online ? (
              <>
                <Wifi size={14} className="text-bronze-400" />
                <FormattedMessage id="common.online" defaultMessage="En línea" />
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-blood-400" />
                <FormattedMessage id="common.offline" defaultMessage="Sin conexión" />
              </>
            )}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => authClient.signOut()}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-forge-2 text-parchment-200 hover:bg-forge-3"
                title={formatMessage({ id: 'auth.logout' })}
              >
                <LogOut size={14} />
              </button>
            ) : (
              <a
                href="/login"
                className="ml-2 flex h-8 items-center gap-1.5 rounded-full bg-forge-2 px-3 text-parchment-200 hover:bg-forge-3"
                title={formatMessage({ id: 'auth.login' })}
              >
                <Lock size={12} />
                <span className="text-xs">
                  <FormattedMessage id="auth.login" defaultMessage="Ingresá" />
                </span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Club banner — info del club compacta, expandible */}
      <ClubBanner info={clubInfo} isAdmin={isAdmin} onEdit={() => setEditModalOpen(true)} />

      {/* Nav tabs — siempre visibles, mobile-first */}
      <NavTabs />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Outlet />
        <Footer />
      </main>

      {/* Edit modal — placeholder por ahora, Ola 8 Día 3 */}
      {editModalOpen && isAdmin && (
        <EditClubModalStub
          info={clubInfo}
          onClose={() => setEditModalOpen(false)}
          onSaved={(updated) => {
            setClubInfo(updated);
            setEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Stub temporal para el modal de edición. La implementación completa
 * (form con todos los campos + validación) va en Día 3 de Ola 8.
 */
function EditClubModalStub({
  info,
  onClose,
  onSaved,
}: {
  info: ClubInfo | null;
  onClose: () => void;
  onSaved: (updated: ClubInfo) => void;
}) {
  const [nombre, setNombre] = useState(info?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(info?.descripcion ?? '');
  const [direccion, setDireccion] = useState(info?.direccion ?? '');
  const [horarios, setHorarios] = useState(info?.horarios ?? '');
  const [contactoEmail, setEmail] = useState(info?.contactoEmail ?? '');
  const [discord, setDiscord] = useState(info?.discord ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await clubApi.update({
        nombre,
        descripcion: descripcion || null,
        direccion: direccion || null,
        horarios: horarios || null,
        contactoEmail: contactoEmail || null,
        discord: discord || null,
      });
      onSaved(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
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
          'w-full max-w-md rounded-t-2xl border border-forge-3 bg-forge-1 p-6 shadow-lifted sm:rounded-2xl',
          'max-h-[90dvh] overflow-y-auto',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-serif text-2xl">Editar info del club</h2>
        {error && <p className="mb-3 text-sm text-blood-400">{error}</p>}
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-parchment-300">Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              maxLength={100}
            />
          </label>
          <label className="block text-sm">
            <span className="text-parchment-300">Descripción</span>
            <textarea
              value={descripcion ?? ''}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              rows={3}
              maxLength={500}
            />
          </label>
          <label className="block text-sm">
            <span className="text-parchment-300">Dirección</span>
            <input
              type="text"
              value={direccion ?? ''}
              onChange={(e) => setDireccion(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            <span className="text-parchment-300">Horarios</span>
            <input
              type="text"
              value={horarios ?? ''}
              onChange={(e) => setHorarios(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              maxLength={300}
              placeholder="Sábados 14–22hs"
            />
          </label>
          <label className="block text-sm">
            <span className="text-parchment-300">Email</span>
            <input
              type="email"
              value={contactoEmail ?? ''}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            <span className="text-parchment-300">Discord</span>
            <input
              type="url"
              value={discord ?? ''}
              onChange={(e) => setDiscord(e.target.value)}
              className="mt-1 w-full rounded border border-forge-3 bg-forge-2 px-3 py-2 text-parchment-50"
              maxLength={200}
              placeholder="https://discord.gg/..."
            />
          </label>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-forge-3 px-4 py-2.5 text-sm text-parchment-200 hover:bg-forge-2"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-lg bg-blood-500 px-4 py-2.5 text-sm font-medium text-parchment-50 hover:bg-blood-400 disabled:opacity-50"
            disabled={saving || !nombre.trim()}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}