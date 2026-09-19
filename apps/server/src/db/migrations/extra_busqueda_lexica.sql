-- Búsqueda léxica sobre kb_chunks — el retrieval del oráculo
--
-- ── Por qué ──────────────────────────────────────────────────────────────
--
-- El oráculo buscaba sólo por similitud de vectores, con el provider de
-- embeddings "determinístico": un hash de cada palabra a uno de 384 buckets.
-- Eso no es un embedding, es ruido estable. Medido con src/eval-retrieval.ts
-- sobre 15 preguntas reales: recall@5 = 0/15. Escribir literalmente
-- "Killing Blow" no traía chunk-rule-killing-blow.
--
-- Nada fallaba: el oráculo contestaba HTTP 200 diciendo con educación que no
-- tenía información suficiente, con citas válidas a los chunks equivocados.
--
-- Con este índice, las mismas 15 preguntas dan recall@5 = 9/15, y 6/6 cuando
-- la pregunta es el nombre de la regla. Las 4 que describen el efecto sin
-- nombrar la regla siguen en 0: eso es el techo de lo léxico, no un bug, y
-- pide un provider de embeddings de verdad.
--
-- ── Decisiones ───────────────────────────────────────────────────────────
--
-- Columna generada y no índice de expresión: el mismo tsvector se necesita
-- para rankear (`ts_rank_cd`), no sólo para filtrar. Calcularlo dos veces por
-- query sobre 3700 filas es trabajo repetido, y una columna STORED lo deja
-- listo. `to_tsvector` con la config literal es IMMUTABLE, que es lo que
-- GENERATED exige.
--
-- `title` pesa 'A' y `text` pesa 'B': la pregunta "Killing Blow" tiene que
-- traer la ficha que se llama así, no las treinta que la mencionan.
--
-- Config 'spanish' aunque el corpus sea mixto: los títulos son nombres
-- propios en inglés y el cuerpo está traducido. Lo que importa es que la
-- consulta y el documento pasen por el MISMO stemmer; con ese criterio las
-- seis preguntas de nombre exacto aciertan.
--
-- ── Nombre del archivo ───────────────────────────────────────────────────
--
-- Prefijo `extra_` y no un número: esto no lo maneja el journal de Drizzle,
-- lo aplica migrate.ts aparte. `0001_pgvector.sql` se llama así por historia
-- y su número ya colisiona con `0001_ambitious_starbolt`; no repetimos eso.
--
-- Idempotente de punta a punta: corre en cada `db:migrate`.

ALTER TABLE kb_chunks
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(text, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks USING GIN (tsv);
