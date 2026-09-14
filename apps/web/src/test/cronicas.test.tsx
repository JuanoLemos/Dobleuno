import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { CronicaCard, quitarAnclas } from '../components/cronicas/CronicaCard.js';
import esAR from '../i18n/es-AR.json';
import type { Cronica } from '@dobleuno/shared';

function wrap(ui: React.ReactNode) {
  return render(
    <IntlProvider locale="es-AR" messages={esAR}>
      <MemoryRouter>{ui}</MemoryRouter>
    </IntlProvider>,
  );
}

function cronica(over: Partial<Cronica> = {}): Cronica {
  return {
    id: 'c-1',
    battleId: 'b-1',
    userId: 'user-1',
    titulo: 'Sábado en el club',
    texto: 'Los Greatswords [u:1] aguantaron el flanco [h:2] hasta el final.',
    visibilidad: 'privada',
    tono: 'cronista',
    promptUsuario: null,
    promptVersion: '0.1',
    modelo: 'deepseek-chat',
    anclas: [],
    warnings: [],
    generaciones: 1,
    generatedAt: '2026-09-14T02:00:00.000Z',
    createdAt: '2026-09-14T01:00:00.000Z',
    updatedAt: '2026-09-14T02:00:00.000Z',
    ...over,
  };
}

describe('quitarAnclas', () => {
  it('saca los marcadores sin dejar espacios dobles', () => {
    expect(quitarAnclas('Los Greatswords [u:1] cargaron [h:2].')).toBe(
      'Los Greatswords cargaron.',
    );
  });

  it('deja intacto un texto sin anclas', () => {
    expect(quitarAnclas('Un relato limpio.')).toBe('Un relato limpio.');
  });
});

describe('CronicaCard', () => {
  it('muestra el título y un extracto sin marcadores', () => {
    wrap(<CronicaCard cronica={cronica()} esMia />);
    expect(screen.getByText('Sábado en el club')).toBeTruthy();
    expect(screen.getByText(/Los Greatswords aguantaron el flanco/)).toBeTruthy();
    expect(screen.queryByText(/\[u:1\]/)).toBeNull();
  });

  it('avisa cuando todavía no hay relato', () => {
    wrap(<CronicaCard cronica={cronica({ texto: null })} esMia />);
    expect(screen.getByText('Sin relato todavía')).toBeTruthy();
  });

  it('muestra el autor solo en las crónicas ajenas', () => {
    const ajena = cronica({ userId: 'otro', autorNombre: 'Juano' });
    const { unmount } = wrap(<CronicaCard cronica={ajena} esMia={false} />);
    expect(screen.getByText('por Juano')).toBeTruthy();
    unmount();

    wrap(<CronicaCard cronica={cronica({ autorNombre: 'Juano' })} esMia />);
    expect(screen.queryByText('por Juano')).toBeNull();
  });

  it('marca la visibilidad solo en las propias', () => {
    const { unmount } = wrap(<CronicaCard cronica={cronica({ visibilidad: 'publica' })} esMia />);
    expect(screen.getByLabelText('Pública')).toBeTruthy();
    unmount();

    wrap(<CronicaCard cronica={cronica({ userId: 'otro' })} esMia={false} />);
    expect(screen.queryByLabelText('Privada')).toBeNull();
  });

  it('cuenta las fotos y los avisos', () => {
    wrap(
      <CronicaCard
        cronica={cronica({
          warnings: ['Nombres que no aparecen en la partida: Steam Tank.'],
          fotos: [
            {
              id: 'f-1',
              cronicaId: 'c-1',
              url: '/api/media/cronicas/abc.webp',
              mime: 'image/webp',
              bytes: 1000,
              ancho: 800,
              alto: 600,
              epigrafe: null,
              orden: 0,
              createdAt: '2026-09-14T02:00:00.000Z',
            },
          ],
        })}
        esMia
      />,
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText(/1 aviso/)).toBeTruthy();
  });
});
