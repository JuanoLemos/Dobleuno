CREATE TYPE "public"."formato_sesion" AS ENUM('2000', '2500', 'open');--> statement-breakpoint
CREATE TABLE "mesas" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"capacidad" integer NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservas" (
	"id" text PRIMARY KEY NOT NULL,
	"sesion_id" text NOT NULL,
	"user_id" text NOT NULL,
	"list_id" text,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"mesa_id" text NOT NULL,
	"fecha" timestamp with time zone NOT NULL,
	"formato" "formato_sesion" NOT NULL,
	"notas" text,
	"admin_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_mesa_id_mesas_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mesas_activa_idx" ON "mesas" USING btree ("activa");--> statement-breakpoint
CREATE UNIQUE INDEX "reservas_sesion_user_unique" ON "reservas" USING btree ("sesion_id","user_id");--> statement-breakpoint
CREATE INDEX "reservas_sesion_idx" ON "reservas" USING btree ("sesion_id");--> statement-breakpoint
CREATE INDEX "reservas_user_idx" ON "reservas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sesiones_fecha_idx" ON "sesiones" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "sesiones_mesa_idx" ON "sesiones" USING btree ("mesa_id");