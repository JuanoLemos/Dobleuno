/**
 * Modal de generación del relato: elegir tono + preferencia de estilo.
 *
 * Overlay bottom-sheet en mobile, centrado en desktop — mismo patrón que
 * MesasAdmin (Ola 9).
 */
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

import { Button } from '../ui/Button.js';
import type { Cronica, TonoCronica } from '@dobleuno/shared';

const TONOS: Array<{ id: TonoCronica; label: string; desc: string }> = [
  { id: 'cronista', label: 'Cronista', desc: 'Sobrio y con color. Los hechos hacen el drama.' },
  { id: 'epico', label: 'Épico', desc: 'Registro heroico, como el trasfondo de un libro de ejército.' },
  { id: 'sobrio', label: 'Parte de batalla', desc: 'Frases cortas, sin adornos. Se lee en 30 segundos.' },
];

const MAX_PROMPT = 500;

export interface GenerarCronicaModalProps {
  cronica: Cronica;
  onClose: () => void;
  onGenerar: (tono: TonoCronica, promptUsuario: string) => Promise<void>;
}

export function GenerarCronicaModal({ cronica, onClose, onGenerar }: GenerarCronicaModalProps) {
  const [tono, setTono] = useState<TonoCronica>(cronica.tono);
  const [prompt, setPrompt] = useState(cronica.promptUsuario ?? '');
  const [generando, setGenerando] = useState(false);

  const yaTieneTexto = Boolean(cronica.texto);

  async function submit(): Promise<void> {
    setGenerando(true);
    try {
      await onGenerar(tono, prompt.trim());
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Generar crónica"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-forge-1 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-parchment-50">
            {yaTieneTexto ? 'Regenerar la crónica' : 'Generar la crónica'}
          </h2>
          <button onClick={onClose} className="touch-target p-1 text-parchment-300" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {yaTieneTexto ? (
          <p className="mb-4 text-sm text-bronze-400">
            Ya hay un relato escrito. Si generás de nuevo, se reemplaza.
          </p>
        ) : null}

        <fieldset className="mb-4">
          <legend className="mb-2 text-xs uppercase tracking-widest text-parchment-300">Tono</legend>
          <div className="space-y-2">
            {TONOS.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                  tono === t.id
                    ? 'border-blood-400 bg-forge-2'
                    : 'border-parchment-300/20 hover:border-parchment-300/40'
                }`}
              >
                <input
                  type="radio"
                  name="tono"
                  value={t.id}
                  checked={tono === t.id}
                  onChange={() => setTono(t.id)}
                  className="mt-1 accent-blood-400"
                />
                <span>
                  <span className="block text-sm font-medium text-parchment-50">{t.label}</span>
                  <span className="block text-xs text-parchment-300">{t.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-parchment-300">
            Algo que quieras pedirle (opcional)
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
            rows={3}
            placeholder="Ej: contá la partida desde el punto de vista de mi general, y no te olvides del desastre del turno 3."
            className="w-full rounded-lg border border-parchment-300/20 bg-forge-2 p-2 text-sm text-parchment-100 placeholder:text-parchment-300/40"
          />
          <span className="mt-1 block text-right text-xs text-parchment-300/60">
            {prompt.length}/{MAX_PROMPT}
          </span>
        </label>

        <p className="mb-4 text-xs text-parchment-300">
          El relato se arma solo con lo que registró el tracker: unidades, bajas y eventos de la
          partida. Lo que no pasó, no se cuenta.
        </p>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={generando} fullWidth>
            <Sparkles size={14} /> {yaTieneTexto ? 'Regenerar' : 'Generar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
