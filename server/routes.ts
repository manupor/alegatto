import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import mammoth from "mammoth";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function ensureDemoUser() {
  let user = await storage.getUser(DEMO_USER_ID);
  if (!user) {
    try {
      await db.execute(sql`
        INSERT INTO users (id, email, password, plan, created_at)
        VALUES (${DEMO_USER_ID}, 'demo@lexai.cr', 'demo', 'FREE', NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    } catch {}
  }
}

async function vectorSearch(queryText: string, materias?: string[], limit = 5) {
  try {
    const embeddingResp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText,
    });
    const embedding = embeddingResp.data[0].embedding;
    const embeddingArray = `[${embedding.join(',')}]`;

    let results: any[];
    if (materias && materias.length > 0) {
      const materiasLiteral = materias.map(m => `'${m.replace(/'/g, "''")}'`).join(',');
      results = await db.execute(sql`
        SELECT fuente, materia, articulo, contenido,
          1 - (embedding <=> ${embeddingArray}::vector) as score
        FROM documents
        WHERE materia = ANY(ARRAY[${sql.raw(materiasLiteral)}])
        ORDER BY embedding <=> ${embeddingArray}::vector
        LIMIT ${limit}
      `);
    } else {
      results = await db.execute(sql`
        SELECT fuente, materia, articulo, contenido,
          1 - (embedding <=> ${embeddingArray}::vector) as score
        FROM documents
        ORDER BY embedding <=> ${embeddingArray}::vector
        LIMIT ${limit}
      `);
    }
    return results;
  } catch (e) {
    console.error("Vector search error:", e);
    return [];
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await ensureDemoUser();
  
  const getUserId = (req: any): string => DEMO_USER_ID;

  // ──────────────────────────────────────────
  // AUTH STUBS (used by frontend hooks)
  // ──────────────────────────────────────────
  app.get("/api/auth/me", (req, res) => {
    res.json({ id: DEMO_USER_ID, email: "demo@lexai.cr", name: "Abogado Demo" });
  });

  app.post("/api/auth/login", async (req, res) => {
    res.json({ id: DEMO_USER_ID, email: "demo@lexai.cr", name: "Abogado Demo" });
  });

  app.post("/api/auth/register", async (req, res) => {
    res.status(201).json({ id: DEMO_USER_ID, email: "demo@lexai.cr", name: "Abogado Demo" });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "ok" });
  });

  // ──────────────────────────────────────────
  // CONVERSATIONS
  // ──────────────────────────────────────────
  app.get("/api/conversations", async (req, res) => {
    const userId = getUserId(req);
    const convs = await storage.getConversations(userId);
    res.json(convs);
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const conv = await storage.getConversation(req.params.id);
    if (!conv) return res.status(404).json({ message: "Not found" });
    const msgs = await storage.getMessages(req.params.id);
    res.json({ ...conv, messages: msgs });
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    await storage.deleteConversation(req.params.id);
    res.status(204).send();
  });

  // ──────────────────────────────────────────
  // AI CHAT WITH RAG
  // ──────────────────────────────────────────
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, conversationId: inputConvId, materias } = req.body;
      if (!prompt) return res.status(400).json({ message: "prompt required" });

      const userId = getUserId(req);
      let conversationId = inputConvId;

      if (!conversationId) {
        const conv = await storage.createConversation({
          userId,
          title: prompt.substring(0, 40),
        });
        conversationId = conv.id;
      }

      await storage.createMessage({ conversationId, role: "user", content: prompt });

      const msgs = await storage.getMessages(conversationId);
      const recent = msgs.slice(-8);
      const searchResults = await vectorSearch(prompt, materias, 5);

      let contextStr = "Contexto de normativa costarricense:\n\n";
      for (const r of searchResults as any[]) {
        contextStr += `[${r.fuente}${r.articulo ? ' - ' + r.articulo : ''}]\n${r.contenido}\n\n`;
      }

      const systemPrompt = `Eres LexAI CR, asistente legal experto en derecho costarricense. 
Responde en español usando el siguiente contexto legal. Si el contexto no es suficiente, indica que debes consultar fuentes adicionales.
${contextStr}`;

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...recent.slice(0, -1).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: prompt }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: responseText,
        tokensUsed: completion.usage?.total_tokens || 0,
      });

      res.json({ response: responseText, conversationId });
    } catch (err: any) {
      console.error("Chat error:", err);
      res.status(500).json({ message: "Error en el chat" });
    }
  });

  // ──────────────────────────────────────────
  // VECTOR SEARCH (normativa)
  // ──────────────────────────────────────────
  app.post("/api/search-normativa", async (req, res) => {
    try {
      const { query, materias, topK = 10 } = req.body;
      if (!query) return res.status(400).json({ message: "query required" });
      const results = await vectorSearch(query, materias, topK);
      res.json({ results });
    } catch (err) {
      res.status(500).json({ message: "Search error" });
    }
  });

  // ──────────────────────────────────────────
  // DOCUMENT ANALYSIS (Module A)
  // ──────────────────────────────────────────
  app.post("/api/analyze-document", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      let extractedText = "";
      const mime = req.file.mimetype;
      const buf = req.file.buffer;

      if (mime === "application/pdf" || req.file.originalname.endsWith(".pdf")) {
        const data = await pdfParse(buf);
        extractedText = data.text;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        req.file.originalname.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: buf });
        extractedText = result.value;
      } else {
        return res.status(400).json({ message: "Formato no soportado. Use PDF o DOCX." });
      }

      if (!extractedText.trim()) {
        return res.status(400).json({ message: "No se pudo extraer texto del documento." });
      }

      const truncated = extractedText.substring(0, 12000);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un asistente legal experto en derecho costarricense.
Analiza el siguiente documento legal y responde ÚNICAMENTE con JSON válido:
{
  "parties": { "plaintiff": "string", "defendant": "string" },
  "claims": ["string"],
  "facts": ["string"],
  "legal_basis": ["string"],
  "detected_omissions": ["string"],
  "procedural_risk": {
    "level": "low" | "medium" | "high",
    "reasons": ["string"],
    "recommendations": ["string"]
  },
  "relevant_articles": ["string"],
  "executive_summary": "string"
}`,
          },
          { role: "user", content: truncated },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const analysis = JSON.parse(raw);
      res.json({ analysis, filename: req.file.originalname });
    } catch (err: any) {
      console.error("Analysis error:", err);
      res.status(500).json({ message: "Error al analizar documento: " + err.message });
    }
  });

  // ──────────────────────────────────────────
  // APPEALS (Module B)
  // ──────────────────────────────────────────
  app.get("/api/appeals", async (req, res) => {
    const userId = getUserId(req);
    const list = await storage.getAppeals(userId);
    res.json(list);
  });

  app.get("/api/appeals/:id", async (req, res) => {
    const appeal = await storage.getAppeal(req.params.id);
    if (!appeal) return res.status(404).json({ message: "Not found" });
    res.json(appeal);
  });

  app.post("/api/appeals", async (req, res) => {
    try {
      const userId = getUserId(req);
      const appeal = await storage.createAppeal({ ...req.body, userId });
      res.status(201).json(appeal);
    } catch (err) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.put("/api/appeals/:id", async (req, res) => {
    try {
      const updated = await storage.updateAppeal(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Update failed" });
    }
  });

  app.post("/api/generate-appeal", async (req, res) => {
    try {
      const {
        processType, caseNumber, resolvingBody, resolutionType, resolutionDate,
        grievances, selectedArticles, manualJurisprudence,
        writingStyle, lawyerName, barNumber, destinationCourt
      } = req.body;

      const styleMap: Record<string, string> = {
        basic: "lenguaje claro y accesible",
        technical: "lenguaje jurídico técnico preciso",
        expert: "lenguaje altamente especializado para expertos",
      };

      const grievancesText = (grievances as any[]).map((g: any, i: number) =>
        `AGRAVIO ${i + 1}: ${g.title}\n${g.description}`
      ).join("\n\n");

      const articlesText = [...(selectedArticles || []), ...(manualJurisprudence ? [manualJurisprudence] : [])].join("; ");

      const today = new Date().toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" });

      const systemPrompt = `Genera un recurso de apelación formal costarricense con la siguiente estructura:
- Encabezado: ciudad, fecha (${today}), tribunal de destino
- Identificación de la parte y número de expediente
- Cada agravio numerado con: hechos, fundamento jurídico, artículos citados
- Sección de petitoria formal ('POR TANTO')
- Bloque de firma con nombre del abogado y número de colegiatura
Utiliza ${styleMap[writingStyle] || "lenguaje jurídico técnico"} del derecho procesal costarricense. Sé técnicamente preciso.`;

      const userPrompt = `Proceso: ${processType}
Órgano resolutor: ${resolvingBody}
Tipo resolución: ${resolutionType}
Fecha resolución: ${resolutionDate}
Número expediente: ${caseNumber}
Tribunal destinatario: ${destinationCourt}
Abogado: ${lawyerName} - Colegiado N° ${barNumber}

AGRAVIOS:
${grievancesText}

FUNDAMENTO LEGAL A CITAR:
${articlesText}

Genera el recurso completo en español formal.`;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_tokens: 4000,
      });

      let full = "";
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          full += text;
          res.write(text);
        }
      }
      res.end();
    } catch (err: any) {
      console.error("Appeal generation error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Error generando recurso" });
    }
  });

  // ──────────────────────────────────────────
  // DOCUMENTS (editor)
  // ──────────────────────────────────────────
  app.get("/api/editor/documents", async (req, res) => {
    const userId = getUserId(req);
    const docs = await storage.getDocuments(userId);
    res.json(docs);
  });

  app.post("/api/editor/documents", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { titulo, contenidoHtml = "<p></p>", tipo = "otro" } = req.body;
      if (!titulo) return res.status(400).json({ message: "titulo required" });
      const doc = await storage.createDocument({ userId, titulo, contenidoHtml, tipo });
      res.status(201).json(doc);
    } catch (err) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.get("/api/editor/documents/:id", async (req, res) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  });

  app.put("/api/editor/documents/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const doc = await storage.getDocument(id);
      if (!doc) return res.status(404).json({ message: "Not found" });

      const { contenidoHtml } = req.body;
      if (contenidoHtml && contenidoHtml !== doc.contenidoHtml) {
        const count = await storage.countDocumentVersions(id);
        if (count >= 10) await storage.deleteOldestVersion(id);
        await storage.createDocumentVersion({ documentId: id, contenidoHtml: doc.contenidoHtml });
      }

      const updated = await storage.updateDocument(id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Update failed" });
    }
  });

  app.delete("/api/editor/documents/:id", async (req, res) => {
    await storage.deleteDocument(req.params.id);
    res.status(204).send();
  });

  app.get("/api/editor/documents/:id/versions", async (req, res) => {
    const versions = await storage.getDocumentVersions(req.params.id);
    res.json(versions);
  });

  app.post("/api/editor/documents/:id/versions/:versionId/restore", async (req, res) => {
    const versions = await storage.getDocumentVersions(req.params.id);
    const v = versions.find(x => x.id === req.params.versionId);
    if (!v) return res.status(404).json({ message: "Version not found" });
    const doc = await storage.updateDocument(req.params.id, { contenidoHtml: v.contenidoHtml });
    res.json(doc);
  });

  // ──────────────────────────────────────────
  // FIRMA
  // ──────────────────────────────────────────
  app.post("/api/firma/enviar", async (req, res) => {
    try {
      const { documentId, firmantes } = req.body;
      const doc = await storage.getDocument(documentId);
      if (!doc) return res.status(404).json({ message: "Document not found" });

      let signatureRequestId = `mock-${Date.now()}`;

      // Real Dropbox Sign call if API key available
      const dropboxKey = process.env.DROPBOX_SIGN_API_KEY;
      if (dropboxKey && firmantes?.length) {
        try {
          const formData = new URLSearchParams();
          formData.append("title", doc.titulo);
          firmantes.forEach((f: any, i: number) => {
            formData.append(`signers[${i}][email_address]`, f.email);
            formData.append(`signers[${i}][name]`, f.nombre);
            formData.append(`signers[${i}][order]`, String(i));
          });

          const resp = await fetch("https://api.hellosign.com/v3/signature_request/send", {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(dropboxKey + ":").toString("base64")}`,
            },
            body: formData,
          });

          if (resp.ok) {
            const data: any = await resp.json();
            signatureRequestId = data.signature_request?.signature_request_id || signatureRequestId;
          }
        } catch (e) {
          console.error("Dropbox Sign error:", e);
        }
      }

      const firmaReq = await storage.createFirmaRequest({
        documentId,
        firmantes,
        signatureRequestId,
        estado: "pendiente",
      });

      await storage.updateDocument(documentId, { estado: "revision" });
      res.json(firmaReq);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/signature/webhook", async (req, res) => {
    try {
      const event = req.body?.event;
      if (event?.event_type === "signature_request_all_signed") {
        const sigReqId = event.signature_request?.signature_request_id;
        if (sigReqId) {
          // Find and update firma request
          // (simplified – in production you'd query by signature_request_id)
        }
      }
      res.json({ status: "ok" });
    } catch (err) {
      res.status(400).json({ message: "Webhook error" });
    }
  });

  app.get("/api/firma/:documentId/status", async (req, res) => {
    const requests = await storage.getFirmaRequests(req.params.documentId);
    res.json(requests);
  });

  // ──────────────────────────────────────────
  // CASES
  // ──────────────────────────────────────────
  app.get("/api/cases", async (req, res) => {
    const userId = getUserId(req);
    res.json(await storage.getCases(userId));
  });

  app.post("/api/cases", async (req, res) => {
    try {
      const userId = getUserId(req);
      const c = await storage.createCase({ ...req.body, userId });
      res.status(201).json(c);
    } catch (err) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.get("/api/cases/:id", async (req, res) => {
    const c = await storage.getCase(req.params.id);
    if (!c) return res.status(404).json({ message: "Not found" });
    const events = await storage.getCaseEvents(req.params.id);
    const notes = await storage.getCaseNotes(req.params.id);
    res.json({ ...c, events, notes });
  });

  app.put("/api/cases/:id", async (req, res) => {
    try {
      const updated = await storage.updateCase(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Update failed" });
    }
  });

  app.post("/api/cases/:id/events", async (req, res) => {
    const e = await storage.createCaseEvent({ ...req.body, caseId: req.params.id, createdBy: getUserId(req) });
    res.status(201).json(e);
  });

  app.post("/api/cases/:id/notes", async (req, res) => {
    const n = await storage.createCaseNote({ ...req.body, caseId: req.params.id, createdBy: getUserId(req) });
    res.status(201).json(n);
  });

  // ──────────────────────────────────────────
  // DEADLINES
  // ──────────────────────────────────────────
  app.get("/api/deadlines", async (req, res) => {
    const userId = getUserId(req);
    res.json(await storage.getDeadlines(userId));
  });

  app.post("/api/deadlines", async (req, res) => {
    const d = await storage.createDeadline({ ...req.body, userId: getUserId(req) });
    res.status(201).json(d);
  });

  app.put("/api/deadlines/:id", async (req, res) => {
    const updated = await storage.updateDeadline(req.params.id, req.body);
    res.json(updated);
  });

  return httpServer;
}
