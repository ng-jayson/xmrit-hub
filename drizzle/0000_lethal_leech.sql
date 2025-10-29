CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "metric" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slideId" text NOT NULL,
	"sortOrder" integer DEFAULT 0,
	"chartType" text DEFAULT 'line',
	"chartConfig" json,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slide" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"workspaceId" text NOT NULL,
	"slideDate" date,
	"sortOrder" integer DEFAULT 0,
	"layout" json,
	"isPublished" boolean DEFAULT false,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submetric" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"category" text,
	"metricId" text NOT NULL,
	"xAxis" text DEFAULT 'date' NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"trend" text,
	"unit" text,
	"aggregationType" text DEFAULT 'none',
	"color" text,
	"metadata" json,
	"dataPoints" json,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"settings" json,
	"isArchived" boolean DEFAULT false,
	"isPublic" boolean DEFAULT true,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric" ADD CONSTRAINT "metric_slideId_slide_id_fk" FOREIGN KEY ("slideId") REFERENCES "public"."slide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slide" ADD CONSTRAINT "slide_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submetric" ADD CONSTRAINT "submetric_metricId_metric_id_fk" FOREIGN KEY ("metricId") REFERENCES "public"."metric"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "metric_slide_id_idx" ON "metric" USING btree ("slideId");--> statement-breakpoint
CREATE INDEX "metric_sort_order_idx" ON "metric" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "slide_workspace_id_idx" ON "slide" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "slide_date_idx" ON "slide" USING btree ("slideDate");--> statement-breakpoint
CREATE INDEX "slide_sort_order_idx" ON "slide" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "submetric_metric_id_idx" ON "submetric" USING btree ("metricId");--> statement-breakpoint
CREATE INDEX "submetric_category_idx" ON "submetric" USING btree ("category");--> statement-breakpoint
CREATE INDEX "workspace_name_idx" ON "workspace" USING btree ("name");