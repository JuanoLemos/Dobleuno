import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { FormattedMessage } from 'react-intl';
import { Helmet } from 'react-helmet-async';

import { AppShell } from './components/layout/AppShell.js';
import { AuthLayout } from './routes/AuthLayout.js';
import { Toast } from './components/ui/Toast.js';

const Home = lazy(() => import('./routes/Home.js').then((m) => ({ default: m.Home })));
const Listas = lazy(() => import('./routes/Listas.js').then((m) => ({ default: m.Listas })));
const ListaEdit = lazy(() =>
  import('./routes/ListaEdit.js').then((m) => ({ default: m.ListaEdit })),
);
const Batalla = lazy(() => import('./routes/Batalla.js').then((m) => ({ default: m.Batalla })));
const BattleEdit = lazy(() =>
  import('./routes/BattleEdit.js').then((m) => ({ default: m.BattleEdit })),
);
const CodexReglas = lazy(() =>
  import('./routes/CodexReglas.js').then((m) => ({ default: m.CodexReglas })),
);
const CodexRegla = lazy(() =>
  import('./routes/CodexRegla.js').then((m) => ({ default: m.CodexRegla })),
);
const CodexItems = lazy(() =>
  import('./routes/CodexItems.js').then((m) => ({ default: m.CodexItems })),
);
const CodexItem = lazy(() =>
  import('./routes/CodexItem.js').then((m) => ({ default: m.CodexItem })),
);
const Sobre = lazy(() => import('./routes/Sobre.js').then((m) => ({ default: m.Sobre })));
const Legal = lazy(() => import('./routes/Legal.js').then((m) => ({ default: m.Legal })));
const Mesas = lazy(() => import('./routes/Mesas.js').then((m) => ({ default: m.Mesas })));
const Cronicas = lazy(() => import('./routes/Cronicas.js').then((m) => ({ default: m.Cronicas })));
const CronicaDetalle = lazy(() =>
  import('./routes/CronicaDetalle.js').then((m) => ({ default: m.CronicaDetalle })),
);
const Login = lazy(() => import('./routes/auth/Login.js').then((m) => ({ default: m.Login })));
const Register = lazy(() =>
  import('./routes/auth/Register.js').then((m) => ({ default: m.Register })),
);

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="font-serif text-xl text-parchment-300">
        <FormattedMessage id="common.loading" defaultMessage="Cargando..." />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      {/* Título base. Las rutas del Codex lo pisan con el suyo; al salir de
          ellas, Helmet restaura este en vez de dejar el de la página anterior. */}
      <Helmet>
        <title>Dobleuno</title>
      </Helmet>
      <Routes>
        {/* Auth routes (sin AppShell) */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <Suspense fallback={<Loading />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Suspense fallback={<Loading />}>
                <Register />
              </Suspense>
            }
          />
        </Route>

        {/* Home cream (Ola 10) — sin AppShell, sin TabShell. Portal editorial. */}
        <Route
          path="/"
          element={
            <Suspense fallback={<Loading />}>
              <Home />
            </Suspense>
          }
        />

        {/* Codex (Ola 11) — piel propia, sin TabShell. Reglamento navegable. */}
        {[
          { path: '/reglas', element: <CodexReglas /> },
          { path: '/reglas/:slug', element: <CodexRegla /> },
          { path: '/items', element: <CodexItems /> },
          { path: '/items/:slug', element: <CodexItem /> },
          { path: '/sobre', element: <Sobre /> },
        ].map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={<Suspense fallback={<Loading />}>{r.element}</Suspense>}
          />
        ))}

        {/* Main app (TabShell — header horizontal con tabs) */}
        <Route element={<AppShell />}>
          <Route
            path="/listas"
            element={
              <Suspense fallback={<Loading />}>
                <Listas />
              </Suspense>
            }
          />
          <Route
            path="/listas/nueva"
            element={
              <Suspense fallback={<Loading />}>
                <ListaEdit />
              </Suspense>
            }
          />
          <Route
            path="/listas/:id"
            element={
              <Suspense fallback={<Loading />}>
                <ListaEdit />
              </Suspense>
            }
          />
          <Route
            path="/batalla"
            element={
              <Suspense fallback={<Loading />}>
                <Batalla />
              </Suspense>
            }
          />
          <Route
            path="/batalla/nueva"
            element={
              <Suspense fallback={<Loading />}>
                <BattleEdit />
              </Suspense>
            }
          />
          <Route
            path="/batalla/:id"
            element={
              <Suspense fallback={<Loading />}>
                <BattleEdit />
              </Suspense>
            }
          />
          <Route
            path="/legal/:kind"
            element={
              <Suspense fallback={<Loading />}>
                <Legal />
              </Suspense>
            }
          />
          <Route
            path="/mesas"
            element={
              <Suspense fallback={<Loading />}>
                <Mesas />
              </Suspense>
            }
          />
          <Route
            path="/cronicas"
            element={
              <Suspense fallback={<Loading />}>
                <Cronicas />
              </Suspense>
            }
          />
          <Route
            path="/cronicas/:id"
            element={
              <Suspense fallback={<Loading />}>
                <CronicaDetalle />
              </Suspense>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  );
}
