CREATE TABLE "magic_items" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"item_types" text[] DEFAULT '{}' NOT NULL,
	"associations" text[] DEFAULT '{}' NOT NULL,
	"source_page" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"last_verified" timestamp DEFAULT now() NOT NULL,
	"search_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"rule_type" text DEFAULT '' NOT NULL,
	"associations" text[] DEFAULT '{}' NOT NULL,
	"related" text[] DEFAULT '{}' NOT NULL,
	"source_page" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"last_verified" timestamp DEFAULT now() NOT NULL,
	"search_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_singular" text DEFAULT '' NOT NULL,
	"army" text DEFAULT '' NOT NULL,
	"associations" text[] DEFAULT '{}' NOT NULL,
	"unit_category" text DEFAULT '' NOT NULL,
	"troop_types" text[] DEFAULT '{}' NOT NULL,
	"profile" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"base_size" text DEFAULT '' NOT NULL,
	"unit_size" text DEFAULT '' NOT NULL,
	"cost" integer,
	"cost_override" text DEFAULT '' NOT NULL,
	"armour_value" text DEFAULT '' NOT NULL,
	"equipment" text DEFAULT '' NOT NULL,
	"special_rules" text DEFAULT '' NOT NULL,
	"options" text DEFAULT '' NOT NULL,
	"source_page" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"last_verified" timestamp DEFAULT now() NOT NULL,
	"search_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "items_name_idx" ON "magic_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "items_type_idx" ON "magic_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "items_slug_idx" ON "magic_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "rules_name_idx" ON "special_rules" USING btree ("name");--> statement-breakpoint
CREATE INDEX "rules_type_idx" ON "special_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "rules_slug_idx" ON "special_rules" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "units_army_idx" ON "units" USING btree ("army");--> statement-breakpoint
CREATE INDEX "units_category_idx" ON "units" USING btree ("unit_category");--> statement-breakpoint
CREATE INDEX "units_name_idx" ON "units" USING btree ("name");--> statement-breakpoint
CREATE INDEX "units_slug_idx" ON "units" USING btree ("slug");