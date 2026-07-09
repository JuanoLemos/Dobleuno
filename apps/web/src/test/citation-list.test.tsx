/**
 * Tests de CitationList — verifica el render de citas con sus iconos por source.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CitationList } from '../components/reglas/CitationList.js';
import type { Citation } from '@dobleuno/shared';

describe('CitationList', () => {
  it('renderiza null cuando no hay citas', () => {
    const { container } = render(<CitationList citations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra cada cita con su título y preview', () => {
    const citations: Citation[] = [
      {
        ref: 'empire-greatswords',
        title: 'Greatswords',
        text: 'La mejor infantería del Imperio…',
        source: 'unit',
      },
      {
        ref: 'rule-killing-blow',
        title: 'Killing Blow',
        text: 'En un 6 para herir…',
        source: 'rule',
      },
    ];
    render(<CitationList citations={citations} />);
    expect(screen.getByText('Citas (2)')).toBeTruthy();
    expect(screen.getByText('Greatswords')).toBeTruthy();
    expect(screen.getByText('Killing Blow')).toBeTruthy();
    expect(screen.getByText(/mejor infantería/i)).toBeTruthy();
  });

  it('muestra el número de cita entre corchetes', () => {
    const citations: Citation[] = [
      {
        ref: 'rule-x',
        title: 'X rule',
        text: 'preview',
        source: 'rule',
      },
    ];
    render(<CitationList citations={citations} />);
    expect(screen.getByText(/\[1\] Regla/)).toBeTruthy();
  });
});