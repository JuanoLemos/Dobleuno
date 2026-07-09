/**
 * Cliente: OraclePanel — muestra pregunta + respuesta + citas.
 * Es el componente "inteligente" que une AskBox + resultado + CitationList.
 * Ola 5.
 */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AskBox } from './AskBox.js';
import { CitationList } from './CitationList.js';
import { Card } from '../ui/Card.js';
import type { AskResponse } from '../../lib/ask-api.js';

interface OraclePanelProps {
  faction?: 'empire' | 'bretonnia';
}

export function OraclePanel({ faction }: OraclePanelProps) {
  const [result, setResult] = useState<AskResponse | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string>('');

  return (
    <div className="space-y-3">
      <AskBox
        faction={faction}
        placeholder="Ej: ¿Cuándo aplica Killing Blow?"
        header={
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-bronze-400" />
            <h3 className="font-serif text-sm uppercase tracking-widest text-bronze-400">
              Oracle — Preguntá a las reglas
            </h3>
          </div>
        }
        onResult={(res, q) => {
          setResult(res);
          setLastQuestion(q);
        }}
      />

      {result && (
        <Card>
          {lastQuestion && (
            <p className="mb-2 text-xs uppercase tracking-wide text-parchment-300">
              Pregunta: <span className="text-parchment-50">{lastQuestion}</span>
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm text-parchment-50">{result.answer}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-parchment-300/60">
            {result.chunksUsed} chunks · {result.provider} · {result.fallback}
          </p>
        </Card>
      )}

      {result && result.citations.length > 0 && <CitationList citations={result.citations} />}
    </div>
  );
}