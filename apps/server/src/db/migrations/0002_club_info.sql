CREATE TABLE "club_info" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"direccion" text,
	"horarios" text,
	"contacto_email" text,
	"contacto_whatsapp" text,
	"discord" text,
	"redes" jsonb DEFAULT '{}'::jsonb,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club_info" ADD CONSTRAINT "club_info_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;