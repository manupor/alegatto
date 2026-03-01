import { pgTable, text, integer, timestamp, json, uuid, customType, boolean } from "drizzle-orm/pg-core";
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

// Multi-tenant: Organizations
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"), // free, pro, enterprise
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgMembers = pgTable("org_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull().default("assistant"), // admin, senior, assistant, intern
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pending invitations for team management
export const orgInvites = pgTable("org_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("assistant"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  orgId: uuid("org_id"),
  title: text("title").notNull().default("Nueva consulta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentEditors = pgTable("document_editors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  orgId: uuid("org_id"),
  titulo: text("titulo").notNull(),
  contenidoHtml: text("contenido_html").notNull(),
  tipo: text("tipo").notNull().default("otro"),
  estado: text("estado").notNull().default("borrador"),
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
  firmantes: json("firmantes").notNull(),
  estado: text("estado").notNull().default("pendiente"),
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

export const appeals = pgTable("appeals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  orgId: uuid("org_id"),
  processType: text("process_type").notNull(),
  caseNumber: text("case_number"),
  resolvingBody: text("resolving_body"),
  resolutionType: text("resolution_type"),
  resolutionDate: text("resolution_date"),
  grievances: json("grievances").notNull().default([]),
  selectedArticles: json("selected_articles").notNull().default([]),
  manualJurisprudence: text("manual_jurisprudence"),
  writingStyle: text("writing_style").default("technical"),
  lawyerName: text("lawyer_name"),
  barNumber: text("bar_number"),
  destinationCourt: text("destination_court"),
  generatedDocument: text("generated_document"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  orgId: uuid("org_id"),
  name: text("name").notNull(),
  client: text("client").notNull(),
  legalArea: text("legal_area").notNull(),
  status: text("status").notNull().default("active"),
  caseNumber: text("case_number"),
  assignedLawyerId: uuid("assigned_lawyer_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const caseEvents = pgTable("case_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull(),
  description: text("description").notNull(),
  eventDate: text("event_date").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const caseNotes = pgTable("case_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull(),
  content: text("content").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deadlines = pgTable("deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id"),
  userId: uuid("user_id").notNull(),
  orgId: uuid("org_id"),
  description: text("description").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ────────────────────────────────────────────
export const organizationRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  invites: many(orgInvites),
}));

export const orgMemberRelations = relations(orgMembers, ({ one }) => ({
  org: one(organizations, { fields: [orgMembers.orgId], references: [organizations.id] }),
  user: one(users, { fields: [orgMembers.userId], references: [users.id] }),
}));

export const userRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  documents: many(documentEditors),
  appeals: many(appeals),
  cases: many(cases),
  orgMemberships: many(orgMembers),
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

export const appealRelations = relations(appeals, ({ one }) => ({
  user: one(users, { fields: [appeals.userId], references: [users.id] }),
}));

export const caseRelations = relations(cases, ({ one, many }) => ({
  user: one(users, { fields: [cases.userId], references: [users.id] }),
  events: many(caseEvents),
  notes: many(caseNotes),
}));

// ── Insert Schemas ────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertDocumentEditorSchema = createInsertSchema(documentEditors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFirmaRequestSchema = createInsertSchema(firmaRequests).omit({ id: true, createdAt: true, completadoAt: true });
export const insertAppealSchema = createInsertSchema(appeals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertOrgMemberSchema = createInsertSchema(orgMembers).omit({ id: true, createdAt: true });

// ── Types ─────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrgMember = typeof orgMembers.$inferSelect;
export type OrgInvite = typeof orgInvites.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DocumentEditor = typeof documentEditors.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type FirmaRequest = typeof firmaRequests.$inferSelect;
export type RawDocument = typeof rawDocuments.$inferSelect;
export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = z.infer<typeof insertAppealSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type CaseEvent = typeof caseEvents.$inferSelect;
export type CaseNote = typeof caseNotes.$inferSelect;
export type Deadline = typeof deadlines.$inferSelect;
