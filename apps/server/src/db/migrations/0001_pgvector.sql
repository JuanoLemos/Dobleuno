-- Ola 5: pgvector extension + columna embedding para kb_chunks.
--
-- Esta migración NO la genera drizzle-kit porque pgvector no es nativo de Drizzle.
-- Se aplica manualmente DESPUÉS de las migraciones generadas:
--   npm run db:migrate
--   psql $DATABASE_URL -f src/db/migrations/0001_pgvector.sql
--
-- Si tu Postgres local no tiene pgvector (imagen bitnami/postgresql por defecto
-- no lo trae), podés:
--   1) Usar la imagen oficial `pgvector/pgvector:pg16` (recomendado)
--   2) Instalar la extension manualmente: `apt install postgresql-16-pgvector`
--
-- El endpoint /api/ask detecta si pgvector está disponible y devuelve 503 con
-- mensaje explicativo si no lo está. El resto de la app sigue funcionando.

CREATE EXTENSION IF NOT EXISTS vector;

-- Columna vector(384) generada desde el JSON en `embedding`.
-- La mantenemos sincronizada con un trigger (insert/update).
ALTER TABLE kb_chunks
  ADD COLUMN IF NOT EXISTS embedding_vec vector(384);

CREATE OR REPLACE FUNCTION sync_kb_chunks_embedding()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    NEW.embedding_vec := (
      SELECT array_agg(x::float8)::vector(384)
      FROM jsonb_array_elements_text(NEW.embedding::jsonb) AS x
    );
  EXCEPTION WHEN OTHERS THEN
    -- Si el JSON está malformado, dejar la columna anterior
    RAISE WARNING 'No se pudo parsear embedding para chunk %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_chunks_embedding_sync ON kb_chunks;
CREATE TRIGGER kb_chunks_embedding_sync
  BEFORE INSERT OR UPDATE OF embedding ON kb_chunks
  FOR EACH ROW
  EXECUTE FUNCTION sync_kb_chunks_embedding();

-- Índice ivfflat para búsqueda rápida por cosine distance.
-- lists=100 está bien para hasta ~100k chunks; ajustar si crece.
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_vec_idx
  ON kb_chunks
  USING ivfflat (embedding_vec vector_cosine_ops)
  WITH (lists = 100);