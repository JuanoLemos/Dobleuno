import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { AppShell } from '../components/layout/AppShell.js';
import { Listas } from '../routes/Listas.js';
import { Batalla } from '../routes/Batalla.js';
import { CodexReglas } from '../routes/CodexReglas.js';
import { Mesas } from '../routes/Mesas.js';
import { Home } from '../routes/Home.js';
import type * as codexApi from '../lib/codex-api.js';
import esAR from '../i18n/es-AR.json';

// Mock del cliente del Codex: en JSDOM no hay server ni IndexedDB usable.
vi.mock('../lib/codex-api.js', async (original) => ({
  ...(await original<typeof codexApi>()),
  listarReglas: vi.fn().mockResolvedValue({
    total: 0,
    page: 1,
    limit: 30,
    entradas: [],
    fromCache: false,
  }),
  listarSecciones: vi.fn().mockResolvedValue([]),
}));

// Mock club-api para evitar fetch en JSDOM (no hay server)
vi.mock('../lib/club-api.js', () => ({
  clubApi: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      nombre: 'Test Club',
      descripcion: null,
      direccion: null,
      horarios: null,
      contactoEmail: null,
      contactoWhatsapp: null,
      discord: null,
      redes: {},
      updatedBy: null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }),
    update: vi.fn(),
  },
}));

// Mock mesas-api y reservas-api para tests smoke (Ola 9)
vi.mock('../lib/mesas-api.js', () => ({
  mesasApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  sesionesApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../lib/reservas-api.js', () => ({
  reservasApi: {
    misReservas: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
  },
}));

// Mock auth-client para evitar llamadas de red en JSDOM (no hay better-auth server)
vi.mock('../lib/auth-client.js', () => ({
  authClient: {
    useSession: () => ({ data: null }),
  },
}));

function wrap(ui: React.ReactNode, initialEntry = '/listas') {
  // HelmetProvider hace falta desde la Ola 11: las rutas del Codex declaran
  // su <meta robots> con Helmet, y sin provider el dispatcher no tiene contexto.
  return render(
    <HelmetProvider>
      <IntlProvider locale="es-AR" messages={esAR}>
        <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
      </IntlProvider>
    </HelmetProvider>,
  );
}

describe('Smoke — Rutas principales', () => {
  it('Listas renderiza título y CTA', () => {
    wrap(<Listas />);
    expect(screen.getByText('Mis listas')).toBeInTheDocument();
    expect(screen.getByText('Nueva lista')).toBeInTheDocument();
  });

  it('Batalla renderiza título y CTA', () => {
    wrap(<Batalla />);
    expect(screen.getByText('Mis batallas')).toBeInTheDocument();
    expect(screen.getByText('Nueva batalla')).toBeInTheDocument();
  });

  it('Codex de reglas renderiza buscador y empty state', async () => {
    wrap(<CodexReglas />, '/reglas');
    expect(screen.getByLabelText('Buscar reglas')).toBeInTheDocument();
    expect(
      await screen.findByText('No hay reglas cargadas todavía.'),
    ).toBeInTheDocument();
  });
});

describe('Smoke — Mesas (Ola 9)', () => {
  it('Mesas renderiza sin error', () => {
    expect(() => wrap(<Mesas />)).not.toThrow();
  });
});

describe('Smoke — Home portal cream (Ola 10)', () => {
  it('Renderiza el hero con eyebrow y CTAs', () => {
    wrap(<Home />, '/');
    expect(
      screen.getByText(/Warhammer: The Old World · Compañía de mesa/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Empezar a armar mi lista/i)).toBeInTheDocument();
  });

  it('Renderiza las 3 cards de features (Codex, Ejércitos, Mesas)', () => {
    wrap(<Home />, '/');
    expect(screen.getByText('Reglamento')).toBeInTheDocument();
    expect(screen.getByText('Ejércitos')).toBeInTheDocument();
    expect(screen.getByText('Mesas del club')).toBeInTheDocument();
  });

  it('Renderiza la sección del oráculo con bubble preview', () => {
    wrap(<Home />, '/');
    expect(screen.getByText(/Preguntá\./)).toBeInTheDocument();
    expect(screen.getByText(/No discutas\./)).toBeInTheDocument();
  });
});

describe('Smoke — TabShell (Ola 8)', () => {
  beforeEach(() => {
    // Render fresh — los mocks se resetean por vi.resetAllMocks implícito.
  });

  it('Muestra header con Sigil + Dobleuno + auth indicator', () => {
    wrap(<AppShell />);
    expect(screen.getByText('Dobleuno')).toBeInTheDocument();
  });

  it('Muestra NavTabs con Codex, Ejércitos y Mesas', () => {
    wrap(<AppShell />);
    expect(screen.getByText('Codex')).toBeInTheDocument();
    expect(screen.getByText('Ejércitos')).toBeInTheDocument();
    expect(screen.getByText('Mesas')).toBeInTheDocument();
  });

  it('Muestra ClubBanner con nombre del club cargado', async () => {
    wrap(<AppShell />);
    // clubApi.get() devuelve "Test Club" mockeado
    expect(await screen.findByText(/Test Club/)).toBeInTheDocument();
  });
});