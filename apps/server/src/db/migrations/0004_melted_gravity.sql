CREATE TYPE "public"."tono_cronica" AS ENUM('cronista', 'epico', 'sobrio');--> statement-breakpoint
CREATE TYPE "public"."visibilidad_cronica" AS ENUM('privada', 'publica');--> statement-breakpoint
CREATE TABLE "cronica_fotos" (
	"id" text PRIMARY KEY NOT NULL,
	"cronica_id" text NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"ancho" integer,
	"alto" integer,
	"epigrafe" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cronicas" (
	"id" text PRIMARY KEY NOT NULL,
	"battle_id" text NOT NULL,
	"user_id" text NOT NULL,
	"titulo" text NOT NULL,
	"texto" text,
	"visibilidad" "visibilidad_cronica" DEFAULT 'privada' NOT NULL,
	"tono" "tono_cronica" DEFAULT 'cronista' NOT NULL,
	"prompt_usuario" text,
	"prompt_version" text,
	"modelo" text,
	"anclas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generaciones" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cronica_fotos" ADD CONSTRAINT "cronica_fotos_cronica_id_cronicas_id_fk" FOREIGN KEY ("cronica_id") REFERENCES "public"."cronicas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cronica_fotos" ADD CONSTRAINT "cronica_fotos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cronicas" ADD CONSTRAINT "cronicas_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cronicas" ADD CONSTRAINT "cronicas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cronica_fotos_filename_unique" ON "cronica_fotos" USING btree ("filename");--> statement-breakpoint
CREATE INDEX "cronica_fotos_cronica_idx" ON "cronica_fotos" USING btree ("cronica_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cronicas_battle_unique" ON "cronicas" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "cronicas_user_idx" ON "cronicas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cronicas_feed_idx" ON "cronicas" USING btree ("visibilidad","updated_at");