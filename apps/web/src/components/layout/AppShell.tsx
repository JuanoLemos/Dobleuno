import { Outlet, NavLink } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { ScrollText, Swords, BookOpen, Wifi, WifiOff, LogOut, User } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { useUIStore } from '../../lib/store.js';
import { authClient } from '../../lib/auth-client.js';

const navItems = [
  { to: '/listas', icon: ScrollText, labelId: 'nav.listas' },
  { to: '/batalla', icon: Swords, labelId: 'nav.batalla' },
  { to: '/reglas', icon: BookOpen, labelId: 'nav.reglas' },
] as const;

export function AppShell() {
  const online = useUIStore((s) => s.online);
  const { formatMessage } = useIntl();
  const session = authClient.useSession();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-forge-0 text-parchment-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-forge-3 bg-forge-1/95 backdrop-blur pt-safe">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="24" viewBox="0 0 100 120" aria-hidden="true">
              <path d="M50 4 L96 4 L96 60 Q96 96 50 116 Q4 96 4 60 L4 4 Z" fill="#a01919" stroke="#b8860b" strokeWidth="4" />
              <text x="50" y="68" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="44" fill="#f7f5f0" fontWeight="bold">2·1</text>
            </svg>
            <span className="font-serif text-lg">Dobleuno</span>
          </div>
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
            {session.data?.user ? (
              <button
                onClick={() => authClient.signOut()}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-forge-2 text-parchment-200 hover:bg-forge-3"
                title={formatMessage({ id: 'auth.logout' })}
              >
                <LogOut size={14} />
              </button>
            ) : (
              <NavLink
                to="/login"
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-forge-2 text-parchment-200 hover:bg-forge-3"
                title={formatMessage({ id: 'auth.login' })}
              >
                <User size={14} />
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-forge-3 bg-forge-1/95 backdrop-blur pb-safe">
        <ul className="flex h-16 items-stretch">
          {navItems.map(({ to, icon: Icon, labelId }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-xs transition-colors',
                    isActive ? 'text-blood-400' : 'text-parchment-300 hover:text-parchment-100',
                  )
                }
              >
                <Icon size={20} />
                <FormattedMessage id={labelId} />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
