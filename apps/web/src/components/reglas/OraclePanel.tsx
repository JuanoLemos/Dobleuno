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
          {/*
            El provider determinístico es un bag-of-words hasheado: no tiene
            semántica, así que el retrieval trae chunks casi al azar. El oráculo
            igual es honesto —si el contexto no tiene la regla, lo dice— pero
            conviene que el usuario sepa por qué no la encuentra, en vez de
            concluir que la regla no está en el Codex.
          */}
          {result.provider === 'deterministic' && (
            <p className="mt-2 rounded-lg border border-bronze-500/30 bg-bronze-500/5 p-2 text-[11px] text-bronze-200">
              Esta instalación usa embeddings sin semántica, así que el oráculo
              puede no encontrar la regla aunque esté en el Codex. Buscala a mano
              en Reglas.
            </p>
          )}
        </Card>
      )}

      {result && result.citations.length > 0 && <CitationList citations={result.citations} />}
    </div>
  );
}