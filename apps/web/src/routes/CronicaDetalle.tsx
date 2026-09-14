/**
 * Cliente: detalle de una crónica — Ola 10.
 *
 * Ruta propia y no modal: el relato es largo, se lee entero y se comparte por
 * link. El dueño además genera, sube fotos y cambia la visibilidad desde acá.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Globe, Lock, Trash2, AlertTriangle } from 'lucide-react';

import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { FotoUploader } from '../components/cronicas/FotoUploader.js';
import { GenerarCronicaModal } from '../components/cronicas/GenerarCronicaModal.js';
import { quitarAnclas } from '../components/cronicas/CronicaCard.js';
import { cronicasApi } from '../lib/cronicas-api.js';
import { authClient } from '../lib/auth-client.js';
import { useUIStore } from '../lib/store.js';
import type { Cronica, CronicaFoto, TonoCronica } from '@dobleuno/shared';

export function CronicaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cronica, setCronica] = useState<Cronica | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  const esMia = Boolean(cronica && userId && cronica.userId === userId);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await cronicasApi.get(id);
        if (!cancelled) setCronica(data);
      } catch (err) {
        if (!cancelled) showToast('Error: ' + (err as Error).message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function generar(tono: TonoCronica, promptUsuario: string): Promise<void> {
    if (!cronica) return;
    try {
      const actualizada = await cronicasApi.generar(cronica.id, {
        tono,
        promptUsuario: promptUsuario || null,
      });
      // El server no devuelve las fotos en esta respuesta: las conservamos.
      setCronica({ ...actualizada, fotos: cronica.fotos });
      setModalAbierto(false);
      showToast('Crónica generada', 'success');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  async function cambiarVisibilidad(): Promise<void> {
    if (!cronica) return;
    const nueva = cronica.visibilidad === 'publica' ? 'privada' : 'publica';
    try {
      const actualizada = await cronicasApi.update(cronica.id, { visibilidad: nueva });
      setCronica({ ...actualizada, fotos: cronica.fotos });
      showToast(nueva === 'publica' ? 'Visible para el club' : 'Ahora es privada', 'success');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  async function borrar(): Promise<void> {
    if (!cronica) return;
    if (!window.confirm('¿Borrar la crónica y sus fotos? No se puede deshacer.')) return;
    try {
      await cronicasApi.remove(cronica.id);
      showToast('Crónica borrada', 'success');
      navigate('/cronicas');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  }

  function setFotos(fotos: CronicaFoto[]): void {
    setCronica((prev) => (prev ? { ...prev, fotos } : prev));
  }

  if (loading) return <p className="text-sm text-parchment-300">Cargando…</p>;

  if (!cronica) {
    return (
      <Card>
        <p className="text-sm text-parchment-300">
          No encontramos esta crónica.{' '}
          <Link to="/cronicas" className="text-bronze-400 underline-offset-4 hover:underline">
            Volver
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/cronicas">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} /> Crónicas
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-xl leading-tight">{cronica.titulo}</h1>
          {!esMia && cronica.autorNombre ? (
            <p className="text-xs text-parchment-300">por {cronica.autorNombre}</p>
          ) : null}
        </div>
      </div>

      {esMia ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => setModalAbierto(true)}>
            <Sparkles size={14} /> {cronica.texto ? 'Regenerar' : 'Generar relato'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void cambiarVisibilidad()}>
            {cronica.visibilidad === 'publica' ? <Globe size={14} /> : <Lock size={14} />}
            {cronica.visibilidad === 'publica' ? 'Pública' : 'Privada'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => void borrar()}>
            <Trash2 size={14} /> Borrar
          </Button>
        </div>
      ) : null}

      {cronica.warnings.length > 0 && esMia ? (
        <Card>
          <div className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-bronze-400" />
            <div className="text-xs text-parchment-200">
              <p className="mb-1 font-medium">Este relato puede tener imprecisiones:</p>
              <ul className="list-inside list-disc space-y-0.5 text-parchment-300">
                {cronica.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {cronica.texto ? (
        <Card>
          <article className="space-y-3 text-sm leading-relaxed text-parchment-100">
            {quitarAnclas(cronica.texto)
              .split('\n\n')
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
          </article>
          {cronica.modelo ? (
            <p className="mt-4 border-t border-parchment-300/10 pt-3 text-xs text-parchment-300/60">
              Generado con {cronica.modelo} · prompt v{cronica.promptVersion} ·{' '}
              {cronica.anclas.length} referencias a la partida
            </p>
          ) : null}
        </Card>
      ) : esMia ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Sparkles size={28} className="text-parchment-300/40" />
            <p className="text-sm text-parchment-300">
              Todavía no generaste el relato de esta partida.
            </p>
          </div>
        </Card>
      ) : null}

      <FotoUploader
        cronicaId={cronica.id}
        fotos={cronica.fotos ?? []}
        onChange={setFotos}
        editable={esMia}
      />

      {modalAbierto ? (
        <GenerarCronicaModal
          cronica={cronica}
          onClose={() => setModalAbierto(false)}
          onGenerar={generar}
        />
      ) : null}
    </div>
  );
}
