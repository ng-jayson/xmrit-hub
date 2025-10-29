import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  json,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const workspaces = pgTable(
  "workspace",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    settings: json("settings"), // JSON for workspace-level settings
    isArchived: boolean("isArchived").default(false),
    isPublic: boolean("isPublic").default(true), // Public workspaces accessible to all
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    nameIdx: index("workspace_name_idx").on(table.name),
  })
);

// Slides table - replaces folders as presentation containers
export const slides = pgTable(
  "slide",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slideDate: date("slideDate"), // Date when the slide represents data for
    sortOrder: integer("sortOrder").default(0),
    layout: json("layout"), // JSON for slide layout configuration
    isPublished: boolean("isPublished").default(false),
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    workspaceIdIdx: index("slide_workspace_id_idx").on(table.workspaceId),
    dateIdx: index("slide_date_idx").on(table.slideDate),
    sortOrderIdx: index("slide_sort_order_idx").on(table.sortOrder),
  })
);

// Metrics table - high-level metric containers
export const metrics = pgTable(
  "metric",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    slideId: text("slideId")
      .notNull()
      .references(() => slides.id, { onDelete: "cascade" }),
    sortOrder: integer("sortOrder").default(0),
    chartType: text("chartType").default("line"), // line, bar, area, etc.
    chartConfig: json("chartConfig"), // JSON for chart configuration
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slideIdIdx: index("metric_slide_id_idx").on(table.slideId),
    sortOrderIdx: index("metric_sort_order_idx").on(table.sortOrder),
  })
);

// Submetrics table - specific metric implementations with visualization config
export const submetrics = pgTable(
  "submetric",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    label: text("label").notNull(),
    category: text("category"),
    metricId: text("metricId")
      .notNull()
      .references(() => metrics.id, { onDelete: "cascade" }),
    // Visualization configuration
    xAxis: text("xAxis").notNull().default("date"),
    timezone: text("timezone").default("UTC"),
    trend: text("trend"), // uptrend, downtrend, stable, etc.
    unit: text("unit"), // %, $, units, etc.
    aggregationType: text("aggregationType").default("none"), // sum, avg, count, etc.
    color: text("color"), // hex color for visualization
    metadata: json("metadata"), // JSON for additional submetric metadata
    // Data points stored as JSON array
    dataPoints: json("dataPoints").$type<
      Array<{
        timestamp: string; // ISO date string
        value: number;
        confidence?: number | null;
        source?: string | null;
        dimensions?: Record<string, unknown> | null;
      }>
    >(),
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    metricIdIdx: index("submetric_metric_id_idx").on(table.metricId),
    categoryIdx: index("submetric_category_idx").on(table.category),
  })
);

// ============================================================================
// RELATIONS - Enable efficient relational queries
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  workspaces: many(workspaces),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  slides: many(slides),
}));

export const slidesRelations = relations(slides, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [slides.workspaceId],
    references: [workspaces.id],
  }),
  metrics: many(metrics),
}));

export const metricsRelations = relations(metrics, ({ one, many }) => ({
  slide: one(slides, {
    fields: [metrics.slideId],
    references: [slides.id],
  }),
  submetrics: many(submetrics),
}));

export const submetricsRelations = relations(submetrics, ({ one }) => ({
  metric: one(metrics, {
    fields: [submetrics.metricId],
    references: [metrics.id],
  }),
}));
