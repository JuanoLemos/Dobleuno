import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import esAR from '../i18n/es-AR.json';

function wrap(ui: React.ReactNode) {
  return render(
    <IntlProvider locale="es-AR" messages={esAR}>
      <MemoryRouter>{ui}</MemoryRouter>
    </IntlProvider>,
  );
}

describe('UI primitives', () => {
  it('Button renderiza texto y responde a click', () => {
    let clicked = 0;
    wrap(<Button onClick={() => clicked++}>Hola</Button>);
    screen.getByText('Hola').click();
    expect(clicked).toBe(1);
  });

  it('Button disabled no responde a click', () => {
    let clicked = 0;
    wrap(
      <Button disabled onClick={() => clicked++}>
        Hola
      </Button>,
    );
    screen.getByText('Hola').click();
    expect(clicked).toBe(0);
  });

  it('Input muestra label y refleja cambios', () => {
    wrap(<Input label="Email" value="x@y.com" onChange={() => undefined} readOnly />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('x@y.com');
  });

  it('Input muestra error si se pasa', () => {
    wrap(<Input label="Email" error="Inválido" value="" onChange={() => undefined} />);
    expect(screen.getByText('Inválido')).toBeInTheDocument();
  });
});
