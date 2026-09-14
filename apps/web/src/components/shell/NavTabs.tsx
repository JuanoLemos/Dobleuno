import { NavLink } from 'react-router-dom';
import { Lock } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { MODULES } from '../../lib/modules.js';
import { useUIStore } from '../../lib/store.js';
import { authClient } from '../../lib/auth-client.js';

/**
 * NavTabs — header horizontal sticky con tabs de módulos.
 *
 * - Sticky bajo el header principal.
 * - Scroll horizontal en mobile (overflow-x-auto, snap).
 * - Si el módulo requiere auth y el user NO está logueado → ícono Lock + click
 *   redirige a /login (no muestra el contenido del módulo).
 *
 * Solo aparecen los módulos en MODULES (registro central). Si un módulo no está
 * implementado, no aparece acá (ADR-007).
 */

export function NavTabs() {
  const online = useUIStore((s) => s.online);
  const session = authClient.useSession();
  const isLoggedIn = Boolean(session.data?.user);

  return (
    <nav
      aria-label="Módulos"
      className="sticky top-12 z-10 border-b border-forge-3 bg-forge-0/95 backdrop-blur"
    >
      <ul className="flex items-stretch overflow-x-auto">
        {MODULES.map(({ id, label, route, icon: Icon, requiresAuth }) => {
          const locked = requiresAuth && !isLoggedIn;
          return (
            <li key={id} className="shrink-0">
              <NavLink
                to={locked ? '/login' : route}
                end={route === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-1.5 px-4 text-sm transition-colors',
                    'border-b-2 border-transparent',
                    isActive && !locked && 'border-blood-400 text-blood-400',
                    !isActive && !locked && 'text-parchment-300 hover:text-parchment-100',
                    locked && 'text-parchment-500 hover:text-parchment-300',
                  )
                }
              >
                <Icon size={16} />
                <span>{label}</span>
                {locked && <Lock size={12} className="ml-0.5 opacity-70" />}
                {!online && !locked && <span className="ml-1 text-[10px] text-parchment-500">offline</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}