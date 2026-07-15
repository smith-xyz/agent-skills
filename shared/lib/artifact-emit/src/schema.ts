import { integer, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  source: text("source").notNull(),
  url: text("url"),
  related: text("related"),
  diagram_ref: text("diagram_ref"),
  node: text("node"),
  next: text("next"),
  blocked: text("blocked"),
  status: text("status", { enum: ["done", "active", "waiting", "needs-me", "stale"] }).notNull(),
  last_action: text("last_action"),
  last_action_at: text("last_action_at"),
  updated: text("updated").notNull(),
  created: text("created").notNull(),
});

export const artifactLinks = sqliteTable(
  "artifact_links",
  {
    fromId: text("from_id").notNull(),
    toId: text("to_id").notNull(),
    rel: text("rel", { enum: ["feeds-into", "depends-on", "tracks", "dupes"] }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.fromId, table.toId, table.rel] })]
);

export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  sourceSkill: text("source_skill"),
  sessionId: text("session_id"),
  status: text("status", { enum: ["new", "accepted", "dismissed"] }).notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artifactId: text("artifact_id").notNull(),
  action: text("action").notNull(),
  changedFields: text("changed_fields"),
  createdAt: text("created_at").notNull(),
});
