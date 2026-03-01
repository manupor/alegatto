import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { openai } from "./replit_integrations/audio/client"; // Reusing the openai instance from integrations
import { db } from "./db";
import { rawDocuments } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth mock for lite mode
  // In a real app we'd use replit auth middleware or session
  const getUserId = (req: any) => "user-123"; 

  // ====================
  // AI CHAT
  // ====================
  app.post(api.chat.message.path, async (req, res) => {
    try {
      const input = api.chat.message.input.parse(req.body);
      const userId = getUserId(req);
      
      let conversationId = input.conversationId;
      
      // Create conversation if it doesn't exist
      if (!conversationId) {
        const title = input.prompt.substring(0, 30) + "...";
        const conv = await storage.createConversation({
          userId,
          title,
        });
        conversationId = conv.id;
      }
      
      // Save user message
      await storage.createMessage({
        conversationId,
        role: "user",
        content: input.prompt
      });
      
      // Get context messages (last 8)
      const messages = await storage.getMessages(conversationId);
      const recentMessages = messages.slice(-8);
      
      // Generate embedding for RAG
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: input.prompt,
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      const embeddingArray = `[${embedding.join(',')}]`;
      
      // Vector search for context
      // Note: We use raw sql here for pgvector query
      const searchResults = await db.execute(sql`
        SELECT fuente, materia, articulo, contenido,
          1 - (embedding <=> ${embeddingArray}::vector) as score
        FROM documents
        ORDER BY embedding <=> ${embeddingArray}::vector
        LIMIT 5
      `);
      
      // Build context string
      let contextStr = "Contexto legal costarricense:\n\n";
      for (const result of searchResults) {
        contextStr += `Fuente: ${(result as any).fuente}\nMateria: ${(result as any).materia}\nArticulo: ${(result as any).articulo || 'N/A'}\nContenido: ${(result as any).contenido}\n\n`;
      }
      
      // System prompt
      const systemMessage = {
        role: "system",
        content: `You are LexAI CR, an expert legal assistant for Costa Rica. Use the following legal context to answer the user's question. If the context doesn't contain the answer, say so, but try to be helpful based on general Costa Rican legal knowledge.\n\n${contextStr}`
      };
      
      const chatHistory = recentMessages.map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      }));
      
      // Call OpenAI
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Falling back since gpt-4o-mini is in AI integrations
        messages: [systemMessage, ...chatHistory, { role: "user", content: input.prompt }],
      });
      
      const responseText = chatResponse.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";
      
      // Save assistant message
      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: responseText,
        tokensUsed: chatResponse.usage?.total_tokens || 0
      });
      
      res.json({ response: responseText, conversationId });
      
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Error en el chat AI" });
    }
  });
  
  app.post(api.chat.searchNormativa.path, async (req, res) => {
    try {
      const input = api.chat.searchNormativa.input.parse(req.body);
      
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: input.query,
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      const embeddingArray = `[${embedding.join(',')}]`;
      const limit = input.topK || 10;
      
      // Simple search, optionally with materia filter
      let query = sql`
        SELECT fuente, materia, articulo, contenido,
          1 - (embedding <=> ${embeddingArray}::vector) as score
        FROM documents
      `;
      
      if (input.materias && input.materias.length > 0) {
        // Need to construct parameterized IN clause properly in real app
        // Simplified for this example
      }
      
      query = sql`${query} ORDER BY embedding <=> ${embeddingArray}::vector LIMIT ${limit}`;
      
      const results = await db.execute(query);
      
      res.json({ results });
      
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Error searching documents" });
    }
  });

  // ====================
  // CONVERSATIONS
  // ====================
  app.get(api.conversations.list.path, async (req, res) => {
    const userId = getUserId(req);
    const convs = await storage.getConversations(userId);
    res.json(convs);
  });
  
  app.get(api.conversations.get.path, async (req, res) => {
    const id = req.params.id;
    const conv = await storage.getConversation(id);
    
    if (!conv) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const messages = await storage.getMessages(id);
    res.json({ ...conv, messages });
  });
  
  app.delete(api.conversations.delete.path, async (req, res) => {
    await storage.deleteConversation(req.params.id);
    res.status(204).send();
  });

  // ====================
  // DOCUMENTS
  // ====================
  app.get(api.documents.list.path, async (req, res) => {
    const userId = getUserId(req);
    const docs = await storage.getDocuments(userId);
    res.json(docs);
  });
  
  app.post(api.documents.create.path, async (req, res) => {
    try {
      const input = api.documents.create.input.parse(req.body);
      const userId = getUserId(req);
      
      const doc = await storage.createDocument({
        ...input,
        userId
      });
      
      // Create initial version
      await storage.createDocumentVersion({
        documentId: doc.id,
        contenidoHtml: doc.contenidoHtml
      });
      
      res.status(201).json(doc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal error" });
      }
    }
  });
  
  app.get(api.documents.get.path, async (req, res) => {
    const id = req.params.id;
    const doc = await storage.getDocument(id);
    
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(doc);
  });
  
  app.put(api.documents.update.path, async (req, res) => {
    try {
      const id = req.params.id;
      const input = api.documents.update.input.parse(req.body);
      
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // If content changed, potentially save a version
      if (input.contenidoHtml && input.contenidoHtml !== doc.contenidoHtml) {
        // Save version logic - check how many versions exist
        const versions = await storage.getDocumentVersions(id);
        if (versions.length >= 10) {
          await storage.deleteOldestVersion(id);
        }
        
        await storage.createDocumentVersion({
          documentId: id,
          contenidoHtml: doc.contenidoHtml // save previous state
        });
      }
      
      const updated = await storage.updateDocument(id, input);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });
  
  app.delete(api.documents.delete.path, async (req, res) => {
    await storage.deleteDocument(req.params.id);
    res.status(204).send();
  });
  
  // Versions
  app.get(api.documents.versions.list.path, async (req, res) => {
    const versions = await storage.getDocumentVersions(req.params.id);
    res.json(versions);
  });
  
  app.post(api.documents.versions.restore.path, async (req, res) => {
    const id = req.params.id;
    const versionId = req.params.versionId;
    
    const versions = await storage.getDocumentVersions(id);
    const versionToRestore = versions.find(v => v.id === versionId);
    
    if (!versionToRestore) {
      return res.status(404).json({ message: "Version not found" });
    }
    
    const doc = await storage.updateDocument(id, { contenidoHtml: versionToRestore.contenidoHtml });
    res.json(doc);
  });
  
  // ====================
  // E-SIGNATURE (MOCK)
  // ====================
  app.post(api.firma.enviar.path, async (req, res) => {
    try {
      const input = api.firma.enviar.input.parse(req.body);
      
      const doc = await storage.getDocument(input.documentId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Update document status
      await storage.updateDocument(input.documentId, { estado: 'revision' });
      
      // Mock Dropbox Sign API call
      // In real app: call Dropbox Sign API here
      
      // Save firma request
      const firmaReq = await storage.createFirmaRequest({
        documentId: input.documentId,
        firmantes: input.firmantes,
        signatureRequestId: `mock-req-${Date.now()}`,
        estado: 'pendiente'
      });
      
      res.json(firmaReq);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });
  
  app.get(api.firma.status.path, async (req, res) => {
    const requests = await storage.getFirmaRequests(req.params.documentId);
    res.json(requests);
  });

  return httpServer;
}
