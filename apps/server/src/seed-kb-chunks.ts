/**
 * Seed script: popula la tabla kb_chunks desde la KB existente.
 *
 * Fuentes:
 *   - apps/server/src/lib/seed-units.ts (9 unidades: 5 Empire + 4 Bretonia)
 *   - apps/server/src/lib/seed-rules.ts (reglas especiales)
 *   - apps/server/src/lib/seed-items.ts (items mágicos)
 *
 * Uso:
 *   npm run kb:seed -w @dobleuno/server
 *   tsx src/lib/seed-kb-chunks.ts
 *
 * Cada unidad/regla/item se chunkifica en 1-3 chunks de texto + embedding
 * (usando el provider activo: deterministic si no hay OPENAI_API_KEY).
 */
import 'dotenv/config';
import { db, isDbHealthy } from './db/client.js';
import { kbChunks } from './db/schema/kb.js';
import { getEmbeddingProvider } from './lib/embeddings.js';
import { SEED_UNITS } from './lib/seed-units.js';
import { log } from './lib/logger.js';

async function main(): Promise<void> {
  if (!(await isDbHealthy())) {
    log.error('Database no disponible. Corré `npm run db:up` primero.');
    process.exit(1);
  }

  const provider = getEmbeddingProvider();
  log.info(`Generando embeddings con provider: ${provider.name} (${provider.dims} dims)`);

  // Limpiar chunks existentes
  await db.delete(kbChunks);

  const chunks: Array<{
    id: string;
    source: 'unit' | 'rule' | 'item' | 'scenario' | 'faq';
    ref: string;
    title: string;
    text: string;
    faction: string | null;
    embedding: string;
  }> = [];

  // ─── Units ───────────────────────────────────────────────────────────
  for (const unit of SEED_UNITS) {
    // Chunk 1: stats
    const statsText = `${unit.name} (${unit.faction}, ${unit.category}).
M${unit.stats.M} WS${unit.stats.WS} BS${unit.stats.BS} S${unit.stats.S} T${unit.stats.T} W${unit.stats.W} I${unit.stats.I} A${unit.stats.A} Ld${unit.stats.Ld} Sv${unit.stats.Sv}.
${unit.pointsPerModel ? `Coste: ${unit.pointsPerModel} pts/modelo. ` : ''}${unit.pointsFixed ? `Coste fijo: ${unit.pointsFixed} pts. ` : ''}Tamaño: ${unit.minSize}${unit.maxSize ? `-${unit.maxSize}` : ''} modelos.`;
    const statsEmb = await provider.embed(statsText);
    chunks.push({
      id: `chunk-${unit.id}-stats`,
      source: 'unit',
      ref: unit.id,
      title: `${unit.name} — Stats`,
      text: statsText,
      faction: unit.faction,
      embedding: JSON.stringify(statsEmb),
    });

    // Chunk 2: weapons + rules
    if (unit.weapons.length > 0 || unit.specialRules.length > 0) {
      const rulesText = `${unit.name}: ${unit.weapons.map((w) => `${w.name} (F${w.strength}, PA${w.armorPenetration})`).join(', ')}. Reglas especiales: ${unit.specialRules.join(', ') || 'ninguna'}.`;
      const rulesEmb = await provider.embed(rulesText);
      chunks.push({
        id: `chunk-${unit.id}-rules`,
        source: 'unit',
        ref: unit.id,
        title: `${unit.name} — Armas y reglas`,
        text: rulesText,
        faction: unit.faction,
        embedding: JSON.stringify(rulesEmb),
      });
    }
  }

  // ─── Reglas especiales (placeholder mínimo) ─────────────────────────
  const basicRules = [
    { id: 'rule-strike-first', name: 'Strike First', text: 'Las unidades con Strike First atacan antes en el combate cuerpo a cuerpo. Si ambos bandos tienen Strike First, se alternan.' },
    { id: 'rule-strike-last', name: 'Strike Last', text: 'Las unidades con Strike Last atacan último en el combate. Si ambos tienen Strike Last, se alternan.' },
    { id: 'rule-killing-blow', name: 'Killing Blow', text: 'En un 6 natural para herir, la wound se convierte en casualty automáticamente, ignorando la salvación por armadura (no por ward).' },
    { id: 'rule-hatred', name: 'Hatred', text: '+1 al impactar en el primer turno de combate cuerpo a cuerpo. Se rerollean los fallos para impactar.' },
    { id: 'rule-fear', name: 'Fear', text: 'Causa -1Ld a unidades enemigas en combate. Las unidades Inmune a Psicología ignoran Fear.' },
  ];
  for (const r of basicRules) {
    const emb = await provider.embed(r.text);
    chunks.push({
      id: `chunk-${r.id}`,
      source: 'rule',
      ref: r.id,
      title: r.name,
      text: r.text,
      faction: null,
      embedding: JSON.stringify(emb),
    });
  }

  // Insertar en batches de 50
  log.info(`Insertando ${chunks.length} chunks…`);
  const batchSize = 50;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await db.insert(kbChunks).values(batch);
  }
  log.info(`✓ Seed completo: ${chunks.length} chunks insertados.`);

  process.exit(0);
}

main().catch((err) => {
  log.error('Seed failed', { error: (err as Error).message });
  process.exit(1);
});