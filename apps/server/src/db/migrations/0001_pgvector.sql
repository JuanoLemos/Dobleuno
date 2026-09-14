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

-- Ola 12 — Este trigger ya NO se traga el error.
--
-- Tenía un `EXCEPTION WHEN OTHERS` que degradaba cualquier fallo a
-- RAISE WARNING, con el comentario "si el JSON está malformado, dejar la
-- columna anterior". La intención era tolerar un JSON roto; el efecto real era
-- tolerar un corpus entero sin vectorizar.
--
-- Con OPENAI_API_KEY seteada el provider devuelve 1536 dimensiones contra una
-- columna vector(384): las 3700 filas entraban con embedding_vec en NULL, el
-- retrieval filtraba IS NOT NULL, matcheaba cero, y el oráculo contestaba "no
-- tengo información suficiente" a todo. El seed salía con exit 0 y la tabla
-- mostraba 3700 filas. Un WARNING en el log de Postgres no lo lee nadie.
--
-- Ahora el insert falla con un mensaje que dice qué hacer.
CREATE OR REPLACE FUNCTION sync_kb_chunks_embedding()
RETURNS TRIGGER AS $$
DECLARE
  dims integer;
BEGIN
  SELECT count(*) INTO dims FROM jsonb_array_elements_text(NEW.embedding::jsonb);

  IF dims <> 384 THEN
    RAISE EXCEPTION
      'El embedding del chunk % tiene % dimensiones y la columna es vector(384). %',
      NEW.id, dims,
      'Suele ser OPENAI_API_KEY seteada: ese provider devuelve 1536. Ver .env.production.example.';
  END IF;

  NEW.embedding_vec := (
    SELECT array_agg(x::float8)::vector(384)
    FROM jsonb_array_elements_text(NEW.embedding::jsonb) AS x
  );

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