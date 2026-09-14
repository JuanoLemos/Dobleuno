/**
 * Subida de fotos de una crónica.
 *
 * El input acepta la cámara directo en mobile (`capture`), y cada archivo pasa
 * por `prepararFoto()` antes de salir: lo que se sube ya viene reducido.
 */
import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';

import { Button } from '../ui/Button.js';
import { cronicasApi, fotoUrl } from '../../lib/cronicas-api.js';
import { prepararFoto } from '../../lib/image-resize.js';
import { useUIStore } from '../../lib/store.js';
import type { CronicaFoto } from '@dobleuno/shared';

/** Tiene que coincidir con MAX_FOTOS_POR_CRONICA del server. */
const MAX_FOTOS = 12;

export interface FotoUploaderProps {
  cronicaId: string;
  fotos: CronicaFoto[];
  onChange: (fotos: CronicaFoto[]) => void;
  /** false para una crónica ajena: se ve la galería, no se edita. */
  editable: boolean;
}

export function FotoUploader({ cronicaId, fotos, onChange, editable }: FotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  const lleno = fotos.length >= MAX_FOTOS;

  async function subir(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    const disponibles = MAX_FOTOS - fotos.length;
    const aSubir = Array.from(files).slice(0, disponibles);
    if (aSubir.length < files.length) {
      showToast(`Máximo ${MAX_FOTOS} fotos por crónica`, 'error');
    }

    setSubiendo(true);
    const nuevas: CronicaFoto[] = [];
    try {
      for (const file of aSubir) {
        const lista = await prepararFoto(file);
        const foto = await cronicasApi.uploadFoto(cronicaId, lista.blob, lista.filename);
        nuevas.push(foto);
      }
      if (nuevas.length > 0) {
        onChange([...fotos, ...nuevas]);
        showToast(nuevas.length === 1 ? 'Foto subida' : `${nuevas.length} fotos subidas`, 'success');
      }
    } catch (err) {
      // Las que ya entraron se conservan: no perdemos el trabajo por una que falló.
      if (nuevas.length > 0) onChange([...fotos, ...nuevas]);
      showToast('Error: ' + (err as Error).message, 'error');
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function borrar(foto: CronicaFoto): Promise<void> {
    if (!window.confirm('¿Borrar esta foto?')) return;
    try {
      await cronicasApi.removeFoto(cronicaId, foto.id);
      onChange(fotos.filter((f) => f.id !== foto.id));
      showToast('Foto borrada', 'success');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  return (
    <section className="space-y-3">
      {fotos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((f) => (
            <li key={f.id} className="relative">
              <img
                src={fotoUrl(f)}
                alt={f.epigrafe ?? ''}
                loading="lazy"
                className="h-32 w-full rounded-lg object-cover"
              />
              {editable ? (
                <button
                  onClick={() => void borrar(f)}
                  className="touch-target absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-parchment-100 hover:bg-blood-500"
                  aria-label="Borrar foto"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {editable ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            hidden
            onChange={(e) => void subir(e.target.files)}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            loading={subiendo}
            disabled={lleno}
          >
            <Camera size={14} /> {lleno ? `Máximo ${MAX_FOTOS}` : 'Agregar fotos'}
          </Button>
        </>
      ) : null}
    </section>
  );
}
