import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-forge-0 px-6 py-12 text-parchment-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <svg width="48" height="58" viewBox="0 0 100 120" aria-hidden="true">
            <path d="M50 4 L96 4 L96 60 Q96 96 50 116 Q4 96 4 60 L4 4 Z" fill="#a01919" stroke="#b8860b" strokeWidth="4" />
            <text x="50" y="68" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="44" fill="#f7f5f0" fontWeight="bold">2·1</text>
          </svg>
          <h1 className="font-serif text-3xl">Dobleuno</h1>
          <p className="text-sm text-parchment-300">El compañero de mesa para TOW</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
