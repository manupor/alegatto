import { 
  users, conversations, messages, documentEditors, documentVersions,
  firmaRequests, appeals, cases, caseEvents, caseNotes, deadlines,
  type InsertUser, type User, type Conversation, type DocumentEditor,
  type DocumentVersion, type FirmaRequest, type Appeal, type InsertAppeal,
  type Case, type InsertCase, type CaseEvent, type CaseNote, type Deadline,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: typeof conversations.$inferInsert): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getMessages(conversationId: string): Promise<typeof messages.$inferSelect[]>;
  createMessage(message: typeof messages.$inferInsert): Promise<typeof messages.$inferSelect>;
  getDocuments(userId: string): Promise<DocumentEditor[]>;
  getDocument(id: string): Promise<DocumentEditor | undefined>;
  createDocument(document: typeof documentEditors.$inferInsert): Promise<DocumentEditor>;
  updateDocument(id: string, document: Partial<typeof documentEditors.$inferInsert>): Promise<DocumentEditor>;
  deleteDocument(id: string): Promise<void>;
  getDocumentVersions(documentId: string): Promise<DocumentVersion[]>;
  createDocumentVersion(version: typeof documentVersions.$inferInsert): Promise<DocumentVersion>;
  deleteOldestVersion(documentId: string): Promise<void>;
  countDocumentVersions(documentId: string): Promise<number>;
  createFirmaRequest(request: typeof firmaRequests.$inferInsert): Promise<FirmaRequest>;
  getFirmaRequests(documentId: string): Promise<FirmaRequest[]>;
  updateFirmaRequest(id: string, updates: Partial<typeof firmaRequests.$inferInsert>): Promise<FirmaRequest>;
  // Appeals
  getAppeals(userId: string): Promise<Appeal[]>;
  getAppeal(id: string): Promise<Appeal | undefined>;
  createAppeal(appeal: InsertAppeal): Promise<Appeal>;
  updateAppeal(id: string, updates: Partial<InsertAppeal>): Promise<Appeal>;
  // Cases
  getCases(userId: string): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(c: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case>;
  getCaseEvents(caseId: string): Promise<CaseEvent[]>;
  createCaseEvent(event: typeof caseEvents.$inferInsert): Promise<CaseEvent>;
  getCaseNotes(caseId: string): Promise<CaseNote[]>;
  createCaseNote(note: typeof caseNotes.$inferInsert): Promise<CaseNote>;
  // Deadlines
  getDeadlines(userId: string): Promise<Deadline[]>;
  createDeadline(deadline: typeof deadlines.$inferInsert): Promise<Deadline>;
  updateDeadline(id: string, updates: Partial<typeof deadlines.$inferInsert>): Promise<Deadline>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv || undefined;
  }

  async createConversation(insertConv: typeof conversations.$inferInsert): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(insertConv).returning();
    return conv;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessages(conversationId: string): Promise<typeof messages.$inferSelect[]> {
    return await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(msg: typeof messages.$inferInsert): Promise<typeof messages.$inferSelect> {
    const [newMsg] = await db.insert(messages).values(msg).returning();
    return newMsg;
  }

  async getDocuments(userId: string): Promise<DocumentEditor[]> {
    return await db.select().from(documentEditors)
      .where(eq(documentEditors.userId, userId))
      .orderBy(desc(documentEditors.updatedAt));
  }

  async getDocument(id: string): Promise<DocumentEditor | undefined> {
    const [doc] = await db.select().from(documentEditors).where(eq(documentEditors.id, id));
    return doc || undefined;
  }

  async createDocument(doc: typeof documentEditors.$inferInsert): Promise<DocumentEditor> {
    const [newDoc] = await db.insert(documentEditors).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: string, updates: Partial<typeof documentEditors.$inferInsert>): Promise<DocumentEditor> {
    const [updatedDoc] = await db.update(documentEditors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documentEditors.id, id))
      .returning();
    return updatedDoc;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documentEditors).where(eq(documentEditors.id, id));
  }

  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return await db.select().from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.createdAt));
  }

  async createDocumentVersion(version: typeof documentVersions.$inferInsert): Promise<DocumentVersion> {
    const [newVersion] = await db.insert(documentVersions).values(version).returning();
    return newVersion;
  }

  async countDocumentVersions(documentId: string): Promise<number> {
    const vs = await db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId));
    return vs.length;
  }

  async deleteOldestVersion(documentId: string): Promise<void> {
    const versions = await db.select().from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(asc(documentVersions.createdAt));
    if (versions.length > 0) {
      await db.delete(documentVersions).where(eq(documentVersions.id, versions[0].id));
    }
  }

  async createFirmaRequest(request: typeof firmaRequests.$inferInsert): Promise<FirmaRequest> {
    const [newReq] = await db.insert(firmaRequests).values(request).returning();
    return newReq;
  }

  async getFirmaRequests(documentId: string): Promise<FirmaRequest[]> {
    return await db.select().from(firmaRequests)
      .where(eq(firmaRequests.documentId, documentId))
      .orderBy(desc(firmaRequests.createdAt));
  }

  async updateFirmaRequest(id: string, updates: Partial<typeof firmaRequests.$inferInsert>): Promise<FirmaRequest> {
    const [updated] = await db.update(firmaRequests).set(updates).where(eq(firmaRequests.id, id)).returning();
    return updated;
  }

  async getAppeals(userId: string): Promise<Appeal[]> {
    return await db.select().from(appeals)
      .where(eq(appeals.userId, userId))
      .orderBy(desc(appeals.createdAt));
  }

  async getAppeal(id: string): Promise<Appeal | undefined> {
    const [appeal] = await db.select().from(appeals).where(eq(appeals.id, id));
    return appeal || undefined;
  }

  async createAppeal(appeal: InsertAppeal): Promise<Appeal> {
    const [newAppeal] = await db.insert(appeals).values(appeal).returning();
    return newAppeal;
  }

  async updateAppeal(id: string, updates: Partial<InsertAppeal>): Promise<Appeal> {
    const [updated] = await db.update(appeals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appeals.id, id))
      .returning();
    return updated;
  }

  async getCases(userId: string): Promise<Case[]> {
    return await db.select().from(cases)
      .where(eq(cases.userId, userId))
      .orderBy(desc(cases.updatedAt));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [c] = await db.select().from(cases).where(eq(cases.id, id));
    return c || undefined;
  }

  async createCase(c: InsertCase): Promise<Case> {
    const [newCase] = await db.insert(cases).values(c).returning();
    return newCase;
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    const [updated] = await db.update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return updated;
  }

  async getCaseEvents(caseId: string): Promise<CaseEvent[]> {
    return await db.select().from(caseEvents)
      .where(eq(caseEvents.caseId, caseId))
      .orderBy(asc(caseEvents.eventDate));
  }

  async createCaseEvent(event: typeof caseEvents.$inferInsert): Promise<CaseEvent> {
    const [e] = await db.insert(caseEvents).values(event).returning();
    return e;
  }

  async getCaseNotes(caseId: string): Promise<CaseNote[]> {
    return await db.select().from(caseNotes)
      .where(eq(caseNotes.caseId, caseId))
      .orderBy(desc(caseNotes.createdAt));
  }

  async createCaseNote(note: typeof caseNotes.$inferInsert): Promise<CaseNote> {
    const [n] = await db.insert(caseNotes).values(note).returning();
    return n;
  }

  async getDeadlines(userId: string): Promise<Deadline[]> {
    return await db.select().from(deadlines)
      .where(eq(deadlines.userId, userId))
      .orderBy(asc(deadlines.dueDate));
  }

  async createDeadline(deadline: typeof deadlines.$inferInsert): Promise<Deadline> {
    const [d] = await db.insert(deadlines).values(deadline).returning();
    return d;
  }

  async updateDeadline(id: string, updates: Partial<typeof deadlines.$inferInsert>): Promise<Deadline> {
    const [updated] = await db.update(deadlines).set(updates).where(eq(deadlines.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
