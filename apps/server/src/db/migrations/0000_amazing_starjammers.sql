CREATE TYPE "public"."chunk_source" AS ENUM('unit', 'rule', 'item', 'scenario', 'faq');--> statement-breakpoint
CREATE TYPE "public"."faction" AS ENUM('empire', 'bretonnia');--> statement-breakpoint
CREATE TYPE "public"."ingest_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'uncommon', 'rare', 'very-rare');--> statement-breakpoint
CREATE TYPE "public"."rule_category" AS ENUM('combat', 'shooting', 'magic', 'movement', 'leadership', 'equipment', 'armour', 'psychology');--> statement-breakpoint
CREATE TYPE "public"."unit_category" AS ENUM('lord', 'hero', 'core', 'special', 'rare');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_log" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"faction" text,
	"status" "ingest_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"files_processed" integer DEFAULT 0 NOT NULL,
	"files_failed" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "kb_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "chunk_source" NOT NULL,
	"ref" text NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"faction" text,
	"embedding" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rarity" "rarity" NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"faction_restriction" text[] DEFAULT '{}' NOT NULL,
	"character_restriction" text[] DEFAULT '{}' NOT NULL,
	"source_page" text NOT NULL,
	"last_verified" timestamp DEFAULT now() NOT NULL,
	"search_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"setup" jsonb NOT NULL,
	"source_page" text,
	"last_verified" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" "rule_category" NOT NULL,
	"source_page" text NOT NULL,
	"last_verified" timestamp DEFAULT now() NOT NULL,
	"search_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"faction" "faction" NOT NULL,
	"category" "unit_category" NOT NULL,
	"name" text NOT NULL,
	"m" integer NOT NULL,
	"ws" integer NOT NULL,
	"bs" integer NOT NULL,
	"s" integer NOT NULL,
	"t" integer NOT NULL,
	"w" integer NOT NULL,
	"i" integer NOT NULL,
	"a" integer NOT NULL,
	"ld" integer NOT NULL,
	"sv" text NOT NULL,
	"min_size" integer DEFAULT 1 NOT NULL,
	"max_size" integer,
	"points_per_model" integer,
	"points_fixed" integer,
	"command_group" jsonb,
	"weapons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"special_rules" text[] DEFAULT '{}' NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_page" text NOT NULL,
	"last_verified" timestamp DEFAULT now() NOT NULL,
	"search_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"faction" text NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'setup' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kb_chunks_source_idx" ON "kb_chunks" USING btree ("source");--> statement-breakpoint
CREATE INDEX "kb_chunks_ref_idx" ON "kb_chunks" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "kb_chunks_faction_idx" ON "kb_chunks" USING btree ("faction");--> statement-breakpoint
CREATE INDEX "items_name_idx" ON "magic_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "items_rarity_idx" ON "magic_items" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX "rules_name_idx" ON "special_rules" USING btree ("name");--> statement-breakpoint
CREATE INDEX "rules_category_idx" ON "special_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "units_faction_idx" ON "units" USING btree ("faction");--> statement-breakpoint
CREATE INDEX "units_category_idx" ON "units" USING btree ("category");--> statement-breakpoint
CREATE INDEX "units_name_idx" ON "units" USING btree ("name");--> statement-breakpoint
CREATE INDEX "lists_user_idx" ON "lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lists_faction_idx" ON "lists" USING btree ("faction");--> statement-breakpoint
CREATE INDEX "battles_user_idx" ON "battles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "battles_status_idx" ON "battles" USING btree ("status");