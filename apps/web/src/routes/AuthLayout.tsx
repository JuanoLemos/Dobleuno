import { Outlet } from 'react-router-dom';

/**
 * Layout para login/register. Hero a pantalla completa con la escena de batalla
 * (hero-armybuilder-dark.png) + el iluminado como splash visual arriba del form.
 */
export function AuthLayout() {
  return (
    <div className="auth-bg relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12 text-parchment-50">
      <div className="auth-overlay absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img
            src="/brand/02-illuminated.png"
            alt="Dobleuno"
            width={140}
            height={158}
            className="sigil-mark drop-shadow-2xl"
            loading="eager"
            decoding="sync"
          />
          <h1 className="font-serif text-3xl">Dobleuno</h1>
          <p className="text-sm text-parchment-300">El compañero de mesa para TOW</p>
        </div>
        <Outlet />
      </div>
      <style>{`
        .auth-bg {
          background-image: url('/brand/hero-armybuilder-dark.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-color: #0a0a0a;
        }
        .auth-overlay {
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.55) 0%,
            rgba(10, 10, 10, 0.4) 40%,
            rgba(10, 10, 10, 0.75) 100%
          );
        }
      `}</style>
    </div>
  );
}