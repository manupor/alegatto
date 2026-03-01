import { 
  users, 
  conversations, 
  messages, 
  documentEditors, 
  documentVersions, 
  firmaRequests,
  rawDocuments,
  type InsertUser,
  type User,
  type InsertConversation,
  type Conversation,
  type DocumentEditor,
  type DocumentVersion,
  type FirmaRequest,
  type RawDocument
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;

  // Messages
  getMessages(conversationId: string): Promise<typeof messages.$inferSelect[]>;
  createMessage(message: typeof messages.$inferInsert): Promise<typeof messages.$inferSelect>;

  // Documents
  getDocuments(userId: string): Promise<DocumentEditor[]>;
  getDocument(id: string): Promise<DocumentEditor | undefined>;
  createDocument(document: typeof documentEditors.$inferInsert): Promise<DocumentEditor>;
  updateDocument(id: string, document: Partial<typeof documentEditors.$inferInsert>): Promise<DocumentEditor>;
  deleteDocument(id: string): Promise<void>;

  // Versions
  getDocumentVersions(documentId: string): Promise<DocumentVersion[]>;
  createDocumentVersion(version: typeof documentVersions.$inferInsert): Promise<DocumentVersion>;
  deleteOldestVersion(documentId: string): Promise<void>;
  
  // Firma
  createFirmaRequest(request: typeof firmaRequests.$inferInsert): Promise<FirmaRequest>;
  getFirmaRequests(documentId: string): Promise<FirmaRequest[]>;
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
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
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

  async createConversation(insertConv: InsertConversation): Promise<Conversation> {
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
}

export const storage = new DatabaseStorage();
