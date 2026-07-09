/**
 * Cliente: AskBox — input + submit para el oracle RAG.
 * Ola 5.
 */
import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { askApi, type AskResponse } from '../../lib/ask-api.js';

interface AskBoxProps {
  faction?: 'empire' | 'bretonnia';
  placeholder?: string;
  onResult?: (result: AskResponse, question: string) => void;
  /** Optional: contenido extra arriba (ej: título de la sección) */
  header?: React.ReactNode;
}

export function AskBox({ faction, placeholder, onResult, header }: AskBoxProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await askApi.question({ question: q, faction });
      onResult?.(res, q);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      {header}
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder ?? 'Preguntá algo sobre las reglas…'}
          rows={2}
          className="w-full rounded-xl border border-forge-3 bg-forge-1 px-3 py-2 text-sm text-parchment-50 placeholder:text-parchment-300/50 focus:border-blood-500 focus:outline-none"
          aria-label="Pregunta al oracle"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-parchment-300/70">
            Las respuestas citan las fuentes de la base de conocimiento.
          </p>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={!question.trim() || loading}
            loading={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Preguntar
          </Button>
        </div>
        {error && <p className="text-xs text-blood-400">Error: {error}</p>}
      </form>
    </Card>
  );
}