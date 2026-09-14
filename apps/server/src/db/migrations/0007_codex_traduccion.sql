-- Ola 11 · Traducción del Codex
--
-- El corpus se carga en inglés y se traduce después: el pipeline puede correr
-- entero sin DEEPSEEK_API_KEY. Por eso las columnas son NULL-ables y sin
-- default — "null" significa "todavía no se tradujo", que es distinto de
-- "traducido igual al inglés" (eso el validador lo marca como error).
ALTER TABLE "special_rules" ADD COLUMN "name_es" text;--> statement-breakpoint
ALTER TABLE "special_rules" ADD COLUMN "description_es" text;--> statement-breakpoint
ALTER TABLE "magic_items" ADD COLUMN "name_es" text;--> statement-breakpoint
ALTER TABLE "magic_items" ADD COLUMN "description_es" text;
