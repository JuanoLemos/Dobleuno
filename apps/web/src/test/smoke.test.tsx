import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { AppShell } from '../components/layout/AppShell.js';
import { Listas } from '../routes/Listas.js';
import { Batalla } from '../routes/Batalla.js';
import { Reglas } from '../routes/Reglas.js';
import esAR from '../i18n/es-AR.json';

function wrap(ui: React.ReactNode) {
  return render(
    <IntlProvider locale="es-AR" messages={esAR}>
      <MemoryRouter initialEntries={['/listas']}>{ui}</MemoryRouter>
    </IntlProvider>,
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

  it('Reglas renderiza input de búsqueda y empty state', () => {
    wrap(<Reglas />);
    expect(screen.getByText('Reglamento')).toBeInTheDocument();
    expect(screen.getByText('Buscá una regla o una unidad.')).toBeInTheDocument();
  });
});

describe('Smoke — AppShell', () => {
  it('Muestra bottom nav con 3 tabs', () => {
    wrap(<AppShell />);
    expect(screen.getByText('Listas')).toBeInTheDocument();
    expect(screen.getByText('Batalla')).toBeInTheDocument();
    expect(screen.getByText('Reglas')).toBeInTheDocument();
  });
});
