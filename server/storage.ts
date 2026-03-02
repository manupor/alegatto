import {
  users, conversations, messages, documentEditors, documentVersions,
  firmaRequests, appeals, cases, caseEvents, caseNotes, deadlines,
  organizations, orgMembers, orgInvites,
  type InsertUser, type User, type Conversation, type DocumentEditor,
  type DocumentVersion, type FirmaRequest, type Appeal, type InsertAppeal,
  type Case, type InsertCase, type CaseEvent, type CaseNote, type Deadline,
  type Organization, type InsertOrganization, type OrgMember, type OrgInvite,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, isNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Conversations
  getConversations(userId: string, orgId?: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: typeof conversations.$inferInsert): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;

  // Messages
  getMessages(conversationId: string): Promise<typeof messages.$inferSelect[]>;
  createMessage(message: typeof messages.$inferInsert): Promise<typeof messages.$inferSelect>;

  // Documents
  getDocuments(userId: string, orgId?: string): Promise<DocumentEditor[]>;
  getDocument(id: string): Promise<DocumentEditor | undefined>;
  createDocument(document: typeof documentEditors.$inferInsert): Promise<DocumentEditor>;
  updateDocument(id: string, document: Partial<typeof documentEditors.$inferInsert>): Promise<DocumentEditor>;
  deleteDocument(id: string): Promise<void>;

  // Versions
  getDocumentVersions(documentId: string): Promise<DocumentVersion[]>;
  createDocumentVersion(version: typeof documentVersions.$inferInsert): Promise<DocumentVersion>;
  deleteOldestVersion(documentId: string): Promise<void>;
  countDocumentVersions(documentId: string): Promise<number>;

  // Firma
  createFirmaRequest(request: typeof firmaRequests.$inferInsert): Promise<FirmaRequest>;
  getFirmaRequests(documentId: string): Promise<FirmaRequest[]>;
  updateFirmaRequest(id: string, updates: Partial<typeof firmaRequests.$inferInsert>): Promise<FirmaRequest>;

  // Appeals
  getAppeals(userId: string, orgId?: string): Promise<Appeal[]>;
  getAppeal(id: string): Promise<Appeal | undefined>;
  createAppeal(appeal: InsertAppeal): Promise<Appeal>;
  updateAppeal(id: string, updates: Partial<InsertAppeal>): Promise<Appeal>;

  // Cases
  getCases(userId: string, orgId?: string): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(c: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case>;
  getCaseEvents(caseId: string): Promise<CaseEvent[]>;
  createCaseEvent(event: typeof caseEvents.$inferInsert): Promise<CaseEvent>;
  getCaseNotes(caseId: string): Promise<CaseNote[]>;
  createCaseNote(note: typeof caseNotes.$inferInsert): Promise<CaseNote>;

  // Deadlines
  getDeadlines(userId: string, orgId?: string): Promise<Deadline[]>;
  createDeadline(deadline: typeof deadlines.$inferInsert): Promise<Deadline>;
  updateDeadline(id: string, updates: Partial<typeof deadlines.$inferInsert>): Promise<Deadline>;

  // Organizations
  getOrg(id: string): Promise<Organization | undefined>;
  getOrgBySlug(slug: string): Promise<Organization | undefined>;
  createOrg(org: InsertOrganization): Promise<Organization>;
  updateOrg(id: string, updates: Partial<InsertOrganization>): Promise<Organization>;
  getOrgMembership(userId: string): Promise<(OrgMember & { org: Organization }) | undefined>;
  getOrgMembers(orgId: string): Promise<(OrgMember & { user: User })[]>;
  addOrgMember(member: typeof orgMembers.$inferInsert): Promise<OrgMember>;
  updateOrgMemberRole(memberId: string, role: string): Promise<OrgMember>;
  removeOrgMember(memberId: string): Promise<void>;
  getOrgInvites(orgId: string): Promise<OrgInvite[]>;
  getOrgInviteByToken(token: string): Promise<OrgInvite | undefined>;
  createOrgInvite(invite: typeof orgInvites.$inferInsert): Promise<OrgInvite>;
  deleteOrgInvite(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getConversations(userId: string, orgId?: string): Promise<Conversation[]> {
    if (orgId) {
      return db.select().from(conversations)
        .where(eq(conversations.orgId, orgId))
        .orderBy(desc(conversations.updatedAt));
    }
    return db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(insertConv: typeof conversations.$inferInsert): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(insertConv).returning();
    return conv;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessages(conversationId: string): Promise<typeof messages.$inferSelect[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt));
  }

  async createMessage(msg: typeof messages.$inferInsert): Promise<typeof messages.$inferSelect> {
    const [newMsg] = await db.insert(messages).values(msg).returning();
    return newMsg;
  }

  async getDocuments(userId: string, orgId?: string): Promise<DocumentEditor[]> {
    if (orgId) {
      return db.select().from(documentEditors).where(eq(documentEditors.orgId, orgId)).orderBy(desc(documentEditors.updatedAt));
    }
    return db.select().from(documentEditors).where(eq(documentEditors.userId, userId)).orderBy(desc(documentEditors.updatedAt));
  }

  async getDocument(id: string): Promise<DocumentEditor | undefined> {
    const [doc] = await db.select().from(documentEditors).where(eq(documentEditors.id, id));
    return doc;
  }

  async createDocument(doc: typeof documentEditors.$inferInsert): Promise<DocumentEditor> {
    const [newDoc] = await db.insert(documentEditors).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: string, updates: Partial<typeof documentEditors.$inferInsert>): Promise<DocumentEditor> {
    const [updatedDoc] = await db.update(documentEditors).set({ ...updates, updatedAt: new Date() }).where(eq(documentEditors.id, id)).returning();
    return updatedDoc;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documentEditors).where(eq(documentEditors.id, id));
  }

  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId)).orderBy(desc(documentVersions.createdAt));
  }

  async createDocumentVersion(version: typeof documentVersions.$inferInsert): Promise<DocumentVersion> {
    const [v] = await db.insert(documentVersions).values(version).returning();
    return v;
  }

  async countDocumentVersions(documentId: string): Promise<number> {
    const vs = await db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId));
    return vs.length;
  }

  async deleteOldestVersion(documentId: string): Promise<void> {
    const versions = await db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId)).orderBy(asc(documentVersions.createdAt));
    if (versions.length > 0) await db.delete(documentVersions).where(eq(documentVersions.id, versions[0].id));
  }

  async createFirmaRequest(request: typeof firmaRequests.$inferInsert): Promise<FirmaRequest> {
    const [r] = await db.insert(firmaRequests).values(request).returning();
    return r;
  }

  async getFirmaRequests(documentId: string): Promise<FirmaRequest[]> {
    return db.select().from(firmaRequests).where(eq(firmaRequests.documentId, documentId)).orderBy(desc(firmaRequests.createdAt));
  }

  async updateFirmaRequest(id: string, updates: Partial<typeof firmaRequests.$inferInsert>): Promise<FirmaRequest> {
    const [r] = await db.update(firmaRequests).set(updates).where(eq(firmaRequests.id, id)).returning();
    return r;
  }

  async getAppeals(userId: string, orgId?: string): Promise<Appeal[]> {
    if (orgId) {
      return db.select().from(appeals).where(eq(appeals.orgId, orgId)).orderBy(desc(appeals.createdAt));
    }
    return db.select().from(appeals).where(eq(appeals.userId, userId)).orderBy(desc(appeals.createdAt));
  }

  async getAppeal(id: string): Promise<Appeal | undefined> {
    const [a] = await db.select().from(appeals).where(eq(appeals.id, id));
    return a;
  }

  async createAppeal(appeal: InsertAppeal): Promise<Appeal> {
    const [a] = await db.insert(appeals).values(appeal).returning();
    return a;
  }

  async updateAppeal(id: string, updates: Partial<InsertAppeal>): Promise<Appeal> {
    const [a] = await db.update(appeals).set({ ...updates, updatedAt: new Date() }).where(eq(appeals.id, id)).returning();
    return a;
  }

  async getCases(userId: string, orgId?: string): Promise<Case[]> {
    if (orgId) {
      return db.select().from(cases).where(eq(cases.orgId, orgId)).orderBy(desc(cases.updatedAt));
    }
    return db.select().from(cases).where(eq(cases.userId, userId)).orderBy(desc(cases.updatedAt));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [c] = await db.select().from(cases).where(eq(cases.id, id));
    return c;
  }

  async createCase(c: InsertCase): Promise<Case> {
    const [newCase] = await db.insert(cases).values(c).returning();
    return newCase;
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    const [c] = await db.update(cases).set({ ...updates, updatedAt: new Date() }).where(eq(cases.id, id)).returning();
    return c;
  }

  async getCaseEvents(caseId: string): Promise<CaseEvent[]> {
    return db.select().from(caseEvents).where(eq(caseEvents.caseId, caseId)).orderBy(asc(caseEvents.eventDate));
  }

  async createCaseEvent(event: typeof caseEvents.$inferInsert): Promise<CaseEvent> {
    const [e] = await db.insert(caseEvents).values(event).returning();
    return e;
  }

  async getCaseNotes(caseId: string): Promise<CaseNote[]> {
    return db.select().from(caseNotes).where(eq(caseNotes.caseId, caseId)).orderBy(desc(caseNotes.createdAt));
  }

  async createCaseNote(note: typeof caseNotes.$inferInsert): Promise<CaseNote> {
    const [n] = await db.insert(caseNotes).values(note).returning();
    return n;
  }

  async getDeadlines(userId: string, orgId?: string): Promise<Deadline[]> {
    if (orgId) {
      return db.select().from(deadlines).where(eq(deadlines.orgId, orgId)).orderBy(asc(deadlines.dueDate));
    }
    return db.select().from(deadlines).where(eq(deadlines.userId, userId)).orderBy(asc(deadlines.dueDate));
  }

  async createDeadline(deadline: typeof deadlines.$inferInsert): Promise<Deadline> {
    const [d] = await db.insert(deadlines).values(deadline).returning();
    return d;
  }

  async updateDeadline(id: string, updates: Partial<typeof deadlines.$inferInsert>): Promise<Deadline> {
    const [d] = await db.update(deadlines).set(updates).where(eq(deadlines.id, id)).returning();
    return d;
  }

  async getOrg(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrgBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async createOrg(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async updateOrg(id: string, updates: Partial<InsertOrganization>): Promise<Organization> {
    const [org] = await db.update(organizations).set(updates).where(eq(organizations.id, id)).returning();
    return org;
  }

  async getOrgMembership(userId: string): Promise<(OrgMember & { org: Organization }) | undefined> {
    const [row] = await db.select({
      id: orgMembers.id,
      orgId: orgMembers.orgId,
      userId: orgMembers.userId,
      role: orgMembers.role,
      createdAt: orgMembers.createdAt,
      org: organizations,
    })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .where(eq(orgMembers.userId, userId));
    return row as any;
  }

  async getOrgMembers(orgId: string): Promise<(OrgMember & { user: User })[]> {
    const rows = await db.select({
      id: orgMembers.id,
      orgId: orgMembers.orgId,
      userId: orgMembers.userId,
      role: orgMembers.role,
      createdAt: orgMembers.createdAt,
      user: users,
    })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, orgId))
      .orderBy(asc(orgMembers.createdAt));
    return rows as any;
  }

  async addOrgMember(member: typeof orgMembers.$inferInsert): Promise<OrgMember> {
    const [m] = await db.insert(orgMembers).values(member).returning();
    return m;
  }

  async updateOrgMemberRole(memberId: string, role: string): Promise<OrgMember> {
    const [m] = await db.update(orgMembers).set({ role }).where(eq(orgMembers.id, memberId)).returning();
    return m;
  }

  async removeOrgMember(memberId: string): Promise<void> {
    await db.delete(orgMembers).where(eq(orgMembers.id, memberId));
  }

  async getOrgInvites(orgId: string): Promise<OrgInvite[]> {
    return db.select().from(orgInvites).where(eq(orgInvites.orgId, orgId)).orderBy(desc(orgInvites.createdAt));
  }

  async getOrgInviteByToken(token: string): Promise<OrgInvite | undefined> {
    const [invite] = await db.select().from(orgInvites).where(eq(orgInvites.token, token)).limit(1);
    return invite;
  }

  async createOrgInvite(invite: typeof orgInvites.$inferInsert): Promise<OrgInvite> {
    const [i] = await db.insert(orgInvites).values(invite).returning();
    return i;
  }

  async deleteOrgInvite(id: string): Promise<void> {
    await db.delete(orgInvites).where(eq(orgInvites.id, id));
  }
}

export const storage = new DatabaseStorage();
