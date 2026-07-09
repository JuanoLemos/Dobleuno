/**
 * Tests del pipeline RAG (rag.ts).
 * Nos enfocamos en:
 *   - extractCitations: parseo del formato [cita:N] y validación contra chunks
 *   - buildUserPrompt (vía ask con chunks mockeados)
 *   - fallback behavior cuando no hay chunks
 */
import { describe, it, expect } from 'vitest';
import { extractCitations } from '../lib/rag.js';
import type { KBChunk } from '../db/schema/kb.js';

const makeChunk = (id: string, ref: string, title: string, text: string): KBChunk => ({
  id,
  source: 'unit',
  ref,
  title,
  text,
  faction: 'empire',
  embedding: '[]',
  createdAt: new Date(),
});

describe('RAG — extractCitations', () => {
  const chunks: KBChunk[] = [
    makeChunk('c1', 'empire-greatswords', 'Greatswords', 'Greatswords son la mejor infantería del Imperio.'),
    makeChunk('c2', 'rule-killing-blow', 'Killing Blow', 'En un 6 para herir, mata automáticamente.'),
    makeChunk('c3', 'item-sword-of-might', 'Sword of Might', '+1S en combate cuerpo a cuerpo.'),
  ];

  it('extrae una cita válida', () => {
    const text = 'Greatswords son la mejor tropa [cita:1] y aplican Killing Blow [cita:2].';
    const citations = extractCitations(text, chunks);
    expect(citations).toHaveLength(2);
    expect(citations[0]?.ref).toBe('empire-greatswords');
    expect(citations[1]?.ref).toBe('rule-killing-blow');
  });

  it('ignora citas duplicadas', () => {
    const text = '[cita:1] otra vez [cita:1] y otra [cita:1]';
    const citations = extractCitations(text, chunks);
    expect(citations).toHaveLength(1);
  });

  it('ignora citas fuera de rango', () => {
    const text = 'No existe [cita:99] ni [cita:0] ni [cita:-1]';
    const citations = extractCitations(text, chunks);
    expect(citations).toHaveLength(0);
  });

  it('ignora citas con N no numérico', () => {
    const text = '[cita:abc] [cita:] [cita:1.5]';
    const citations = extractCitations(text, chunks);
    expect(citations).toHaveLength(0);
  });

  it('devuelve array vacío si no hay citas', () => {
    expect(extractCitations('texto sin citas', chunks)).toEqual([]);
    expect(extractCitations('', chunks)).toEqual([]);
  });

  it('trunca el text de cada cita a 200 chars + ellipsis', () => {
    const longText = 'x'.repeat(500);
    const longChunks: KBChunk[] = [makeChunk('c1', 'long', 'Long', longText)];
    const citations = extractCitations('[cita:1]', longChunks);
    expect(citations[0]?.text.length).toBe(201); // 200 + ellipsis
    expect(citations[0]?.text.endsWith('…')).toBe(true);
  });

  it('incluye el source correcto en cada citation', () => {
    const citations = extractCitations('[cita:1] [cita:2] [cita:3]', chunks);
    expect(citations.map((c) => c.source)).toEqual(['unit', 'unit', 'unit']);
  });
});