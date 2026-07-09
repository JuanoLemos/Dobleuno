import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { FormattedMessage } from 'react-intl';

import { AppShell } from './components/layout/AppShell.js';
import { AuthLayout } from './routes/AuthLayout.js';
import { Toast } from './components/ui/Toast.js';

const Listas = lazy(() => import('./routes/Listas.js').then((m) => ({ default: m.Listas })));
const ListaEdit = lazy(() =>
  import('./routes/ListaEdit.js').then((m) => ({ default: m.ListaEdit })),
);
const Batalla = lazy(() => import('./routes/Batalla.js').then((m) => ({ default: m.Batalla })));
const BattleEdit = lazy(() =>
  import('./routes/BattleEdit.js').then((m) => ({ default: m.BattleEdit })),
);
const Reglas = lazy(() => import('./routes/Reglas.js').then((m) => ({ default: m.Reglas })));
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

        {/* Main app (con AppShell + bottom nav) */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/listas" replace />} />
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
            path="/reglas"
            element={
              <Suspense fallback={<Loading />}>
                <Reglas />
              </Suspense>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/listas" replace />} />
      </Routes>
      <Toast />
    </>
  );
}
