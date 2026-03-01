import { pgTable, text, serial, integer, timestamp, json, uuid, customType } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)';
  },
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  plan: text("plan").default("FREE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull().default("Nueva consulta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentEditors = pgTable("document_editors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  titulo: text("titulo").notNull(),
  contenidoHtml: text("contenido_html").notNull(),
  tipo: text("tipo").notNull().default("otro"),
  estado: text("estado").notNull().default("borrador"), // borrador, revision, firmado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  contenidoHtml: text("contenido_html").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const firmaRequests = pgTable("firma_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  signatureRequestId: text("signature_request_id"),
  firmantes: json("firmantes").notNull(), // Array of {nombre, email}
  estado: text("estado").notNull().default("pendiente"), // pendiente, firmado, cancelado
  pdfFirmadoUrl: text("pdf_firmado_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completadoAt: timestamp("completado_at"),
});

export const rawDocuments = pgTable("documents", {
  id: text("id").primaryKey(),
  fuente: text("fuente").notNull(),
  materia: text("materia").notNull(),
  articulo: text("articulo"),
  contenido: text("contenido").notNull(),
  embedding: vector("embedding"),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  documents: many(documentEditors),
}));

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const documentEditorRelations = relations(documentEditors, ({ one, many }) => ({
  user: one(users, { fields: [documentEditors.userId], references: [users.id] }),
  versions: many(documentVersions),
  firmaRequests: many(firmaRequests),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertDocumentEditorSchema = createInsertSchema(documentEditors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFirmaRequestSchema = createInsertSchema(firmaRequests).omit({ id: true, createdAt: true, completadoAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DocumentEditor = typeof documentEditors.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type FirmaRequest = typeof firmaRequests.$inferSelect;
export type RawDocument = typeof rawDocuments.$inferSelect;
