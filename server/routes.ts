import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import mammoth from "mammoth";
import { randomUUID } from "crypto";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import { runLegalPipeline, LEGAL_SYSTEM_PROMPT, ensureCacheLoaded } from "./legal-pipeline";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function ensureDemoUser() {
  try {
    await db.execute(sql`
      INSERT INTO users (id, email, password, plan, created_at)
      VALUES (${DEMO_USER_ID}, 'demo@lexai.cr', 'demo', 'FREE', NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function getOrgCtx(userId: string) {
  const membership = await storage.getOrgMembership(userId);
  if (!membership) return { org: null, role: null, orgId: null };
  return { org: membership.org, role: membership.role, orgId: membership.org.id };
}

const ROLE_RANK: Record<string, number> = { admin: 4, senior: 3, assistant: 2, intern: 1 };

function hasRoleAtLeast(role: string | null, required: string): boolean {
  return (ROLE_RANK[role ?? ""] ?? 0) >= (ROLE_RANK[required] ?? 99);
}

/**
 * Legal document retrieval using PostgreSQL full-text search (Spanish).
 * Uses plainto_tsquery for natural language queries + ts_rank for relevance.
 * Falls back to ILIKE if FTS returns no results.
 */
async function vectorSearch(queryText: string, materias?: string[], limit = 5): Promise<any[]> {
  try {
    const hasMaterias = materias && materias.length > 0;

    // Primary: full-text search with Spanish stemming
    let rows: any[];
    if (hasMaterias) {
      const materiasLiteral = materias!.map(m => `'${m.replace(/'/g, "''")}'`).join(",");
      const result = await db.execute(sql`
        SELECT fuente, materia, articulo, contenido,
          ts_rank(to_tsvector('spanish', contenido), plainto_tsquery('spanish', ${queryText})) AS score
        FROM documents
        WHERE to_tsvector('spanish', contenido) @@ plainto_tsquery('spanish', ${queryText})
          AND materia = ANY(ARRAY[${sql.raw(materiasLiteral)}])
        ORDER BY score DESC
        LIMIT ${limit}
      `);
      rows = Array.isArray(result) ? result : (result as any).rows ?? [];
    } else {
      const result = await db.execute(sql`
        SELECT fuente, materia, articulo, contenido,
          ts_rank(to_tsvector('spanish', contenido), plainto_tsquery('spanish', ${queryText})) AS score
        FROM documents
        WHERE to_tsvector('spanish', contenido) @@ plainto_tsquery('spanish', ${queryText})
        ORDER BY score DESC
        LIMIT ${limit}
      `);
      rows = Array.isArray(result) ? result : (result as any).rows ?? [];
    }

    // Fallback: if FTS returns nothing, try keyword ILIKE search
    if (rows.length === 0) {
      const likePattern = `%${queryText.substring(0, 60)}%`;
      if (hasMaterias) {
        const materiasLiteral = materias!.map(m => `'${m.replace(/'/g, "''")}'`).join(",");
        const result = await db.execute(sql`
          SELECT fuente, materia, articulo, contenido, 0.1::float AS score
          FROM documents
          WHERE contenido ILIKE ${likePattern}
            AND materia = ANY(ARRAY[${sql.raw(materiasLiteral)}])
          LIMIT ${limit}
        `);
        rows = Array.isArray(result) ? result : (result as any).rows ?? [];
      } else {
        const result = await db.execute(sql`
          SELECT fuente, materia, articulo, contenido, 0.1::float AS score
          FROM documents
          WHERE contenido ILIKE ${likePattern}
          LIMIT ${limit}
        `);
        rows = Array.isArray(result) ? result : (result as any).rows ?? [];
      }
    }

    return rows;
  } catch (e) {
    console.error("Legal search error:", e);
    return [];
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await ensureDemoUser();
  const getUserId = (_req: any): string => DEMO_USER_ID;

  // ──────────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────────
  app.get("/api/auth/me", async (req, res) => {
    const userId = getUserId(req);
    const { org, role } = await getOrgCtx(userId);
    res.json({
      id: userId,
      email: "demo@lexai.cr",
      name: "Abogado Demo",
      org: org ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan } : null,
      role,
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { org, role } = await getOrgCtx(DEMO_USER_ID);
    res.json({ id: DEMO_USER_ID, email: "demo@lexai.cr", name: "Abogado Demo", org, role });
  });

  app.post("/api/auth/register", async (req, res) => {
    res.status(201).json({ id: DEMO_USER_ID, email: "demo@lexai.cr", name: "Abogado Demo" });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ message: "ok" });
  });

  // ──────────────────────────────────────────
  // ORG CONTEXT
  // ──────────────────────────────────────────
  app.get("/api/org/context", async (req, res) => {
    const userId = getUserId(req);
    const { org, role } = await getOrgCtx(userId);
    res.json({
      org: org ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan } : null,
      role,
      isAdmin: role === "admin",
      isSenior: role === "senior" || role === "admin",
      canEdit: ["admin", "senior", "assistant"].includes(role ?? ""),
      canViewAnalytics: role === "admin",
      canManageTeam: role === "admin",
    });
  });

  // ── Register firm (create org) ──
  app.post("/api/org/register", async (req, res) => {
    try {
      const { name, slug, plan = "free" } = req.body;
      if (!name || !slug) return res.status(400).json({ message: "name and slug required" });

      const existing = await storage.getOrgBySlug(slug);
      if (existing) return res.status(409).json({ message: "Ese identificador ya está en uso" });

      const userId = getUserId(req);
      const org = await storage.createOrg({ name, slug, plan });
      await storage.addOrgMember({ orgId: org.id, userId, role: "admin" });

      res.status(201).json({ org, role: "admin" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Validate slug ──
  app.get("/api/org/slug/:slug", async (req, res) => {
    const org = await storage.getOrgBySlug(req.params.slug);
    res.json({ available: !org });
  });

  // ── Team management (admin only) ──
  app.get("/api/org/members", async (req, res) => {
    const userId = getUserId(req);
    const { orgId, role } = await getOrgCtx(userId);
    if (!orgId || !hasRoleAtLeast(role, "admin")) return res.status(403).json({ message: "Acceso denegado" });
    const members = await storage.getOrgMembers(orgId);
    res.json(members);
  });

  app.put("/api/org/members/:id/role", async (req, res) => {
    const userId = getUserId(req);
    const { orgId, role } = await getOrgCtx(userId);
    if (!orgId || !hasRoleAtLeast(role, "admin")) return res.status(403).json({ message: "Acceso denegado" });
    const { role: newRole } = req.body;
    if (!["admin", "senior", "assistant", "intern"].includes(newRole)) return res.status(400).json({ message: "Rol inválido" });
    const updated = await storage.updateOrgMemberRole(req.params.id, newRole);
    res.json(updated);
  });

  app.delete("/api/org/members/:id", async (req, res) => {
    const userId = getUserId(req);
    const { orgId, role } = await getOrgCtx(userId);
    if (!orgId || !hasRoleAtLeast(role, "admin")) return res.status(403).json({ message: "Acceso denegado" });
    await storage.removeOrgMember(req.params.id);
    res.status(204).send();
  });

  // ── Invites ──
  app.get("/api/org/invites", async (req, res) => {
    const userId = getUserId(req);
    const { orgId, role } = await getOrgCtx(userId);
    if (!orgId || !hasRoleAtLeast(role, "admin")) return res.status(403).json({ message: "Acceso denegado" });
    const invites = await storage.getOrgInvites(orgId);
    res.json(invites);
  });

  app.post("/api/org/invite", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { orgId, role } = await getOrgCtx(userId);
      if (!orgId || !hasRoleAtLeast(role, "admin")) return res.status(403).json({ message: "Acceso denegado" });

      const { email, role: inviteRole = "assistant" } = req.body;
      if (!email) return res.status(400).json({ message: "email required" });

      const token = randomUUID();
      const invite = await storage.createOrgInvite({ orgId, email, role: inviteRole, token });
      // In production, send email here; for now return the invite link
      const inviteLink = `${req.protocol}://${req.get("host")}/invite/${token}`;
      res.status(201).json({ invite, inviteLink });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/org/invites/:id", async (req, res) => {
    const userId = getUserId(req);
    const { orgId, role } = await getOrgCtx(userId);
    if (!orgId || !hasRoleAtLeast(role, "admin")) return res.status(403).json({ message: "Acceso denegado" });
    await storage.deleteOrgInvite(req.params.id);
    res.status(204).send();
  });

  // ──────────────────────────────────────────
  // CONVERSATIONS
  // ──────────────────────────────────────────
  app.get("/api/conversations", async (req, res) => {
    const userId = getUserId(req);
    const { orgId } = await getOrgCtx(userId);
    const convs = await storage.getConversations(userId, orgId ?? undefined);
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
  // AI CHAT
  // ──────────────────────────────────────────
  // Warm up legal corpus cache on startup
  ensureCacheLoaded().catch(e => console.error("Cache warmup error:", e));

  app.post("/api/chat", async (req, res) => {
    const t0 = Date.now();
    try {
      const { prompt, conversationId: inputConvId, materias } = req.body;
      if (!prompt) return res.status(400).json({ message: "prompt required" });

      const userId = getUserId(req);
      const { orgId } = await getOrgCtx(userId);
      let conversationId = inputConvId;

      if (!conversationId) {
        const conv = await storage.createConversation({
          userId,
          orgId: orgId ?? undefined,
          title: prompt.substring(0, 60),
        });
        conversationId = conv.id;
      }

      await storage.createMessage({ conversationId, role: "user", content: prompt });

      // Fetch last 10 messages for conversation context
      const msgs = await storage.getMessages(conversationId);
      const historyMsgs = msgs
        .slice(-11, -1)
        .map(m => ({ role: m.role, content: m.content }));

      // Run the 3-layer retrieval pipeline
      const { groundedMessage, contextStr, layerStats } = await runLegalPipeline(prompt, historyMsgs, materias);

      console.log(`[Chat] Pipeline stats — A:${layerStats.a} B:${layerStats.b} C:${layerStats.c} articles | context=${contextStr.length} chars`);
      if (contextStr.length > 0) {
        const artRefs = contextStr.match(/Artículo\s+[\d]+/g) || [];
        console.log(`[Chat] Context articles: ${artRefs.join(", ")}`);
      }

      // Build messages array: system + history + grounded user message
      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: LEGAL_SYSTEM_PROMPT },
        ...historyMsgs.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: groundedMessage },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        max_tokens: 2500,
        messages: chatMessages,
      });

      const responseText = completion.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";
      const durationMs = Date.now() - t0;

      // Extract metadata from response using regex
      const materiaMatch = /\*\*Materia\*\*:\s*\[?([A-Z_]+)\]?/i.exec(responseText);
      const riesgoMatch = /\*\*Riesgo Procesal\*\*:\s*\[?([A-Z\/]+)\]?/i.exec(responseText);
      const materiaDetected = materiaMatch?.[1] ?? null;
      const riesgoDetected = riesgoMatch?.[1] ?? null;

      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: responseText,
        tokensUsed: completion.usage?.total_tokens || 0,
      });

      res.json({
        response: responseText,
        conversationId,
        meta: {
          materia: materiaDetected,
          riesgo: riesgoDetected,
          layerStats,
          durationMs,
          tokensUsed: completion.usage?.total_tokens || 0,
        },
      });
    } catch (err: any) {
      console.error("Chat error:", err);
      res.status(500).json({ message: "Error en el chat" });
    }
  });

  // ──────────────────────────────────────────
  // VECTOR SEARCH
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
  // DOCUMENT ANALYSIS
  // ──────────────────────────────────────────
  app.post("/api/analyze-document", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      let extractedText = "";
      const buf = req.file.buffer;
      const name = req.file.originalname;

      if (name.endsWith(".pdf") || req.file.mimetype === "application/pdf") {
        const data = await pdfParse(buf);
        extractedText = data.text;
      } else if (name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: buf });
        extractedText = result.value;
      } else {
        return res.status(400).json({ message: "Formato no soportado. Use PDF o DOCX." });
      }

      if (!extractedText.trim()) return res.status(400).json({ message: "No se pudo extraer texto del documento." });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un asistente legal experto en derecho costarricense. Analiza el siguiente documento legal y responde ÚNICAMENTE con JSON válido:
{"parties":{"plaintiff":"string","defendant":"string"},"claims":["string"],"facts":["string"],"legal_basis":["string"],"detected_omissions":["string"],"procedural_risk":{"level":"low|medium|high","reasons":["string"],"recommendations":["string"]},"relevant_articles":["string"],"executive_summary":"string"}`,
          },
          { role: "user", content: extractedText.substring(0, 12000) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const analysis = JSON.parse(completion.choices[0]?.message?.content || "{}");
      res.json({ analysis, filename: req.file.originalname });
    } catch (err: any) {
      console.error("Analysis error:", err);
      res.status(500).json({ message: "Error al analizar: " + err.message });
    }
  });

  // ──────────────────────────────────────────
  // APPEALS
  // ──────────────────────────────────────────
  app.get("/api/appeals", async (req, res) => {
    const userId = getUserId(req);
    const { orgId } = await getOrgCtx(userId);
    res.json(await storage.getAppeals(userId, orgId ?? undefined));
  });

  app.get("/api/appeals/:id", async (req, res) => {
    const a = await storage.getAppeal(req.params.id);
    if (!a) return res.status(404).json({ message: "Not found" });
    res.json(a);
  });

  app.post("/api/appeals", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { orgId } = await getOrgCtx(userId);
      const a = await storage.createAppeal({ ...req.body, userId, orgId: orgId ?? undefined });
      res.status(201).json(a);
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
        writingStyle, lawyerName, barNumber, destinationCourt,
      } = req.body;

      const styleMap: Record<string, string> = {
        basic: "lenguaje claro y accesible",
        technical: "lenguaje jurídico técnico preciso",
        expert: "lenguaje altamente especializado para expertos",
      };

      const grievancesText = (grievances as any[]).map((g: any, i: number) =>
        `AGRAVIO ${i + 1}: ${g.title}\n${g.description}`).join("\n\n");

      const articlesText = [...(selectedArticles || []), ...(manualJurisprudence ? [manualJurisprudence] : [])].join("; ");
      const today = new Date().toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" });

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Genera un recurso de apelación formal costarricense con la siguiente estructura:
- Encabezado: ciudad, fecha (${today}), tribunal de destino
- Identificación de la parte y número de expediente
- Cada agravio numerado con: hechos, fundamento jurídico, artículos citados
- Sección de petitoria formal ('POR TANTO')
- Bloque de firma con nombre del abogado y número de colegiatura
Utiliza ${styleMap[writingStyle] || "lenguaje jurídico técnico"} del derecho procesal costarricense.`,
          },
          {
            role: "user",
            content: `Proceso: ${processType}\nÓrgano: ${resolvingBody}\nTipo resolución: ${resolutionType}\nFecha: ${resolutionDate}\nExpediente: ${caseNumber}\nTribunal destino: ${destinationCourt}\nAbogado: ${lawyerName} - Colegiado N° ${barNumber}\n\nAGRAVIOS:\n${grievancesText}\n\nFUNDAMENTO LEGAL:\n${articlesText}`,
          },
        ],
        stream: true,
        max_tokens: 4000,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) res.write(text);
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
    const { orgId } = await getOrgCtx(userId);
    res.json(await storage.getDocuments(userId, orgId ?? undefined));
  });

  app.post("/api/editor/documents", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { orgId } = await getOrgCtx(userId);
      const { titulo, contenidoHtml = "<p></p>", tipo = "otro" } = req.body;
      if (!titulo) return res.status(400).json({ message: "titulo required" });
      const doc = await storage.createDocument({ userId, orgId: orgId ?? undefined, titulo, contenidoHtml, tipo });
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
            headers: { Authorization: `Basic ${Buffer.from(dropboxKey + ":").toString("base64")}` },
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

      const firmaReq = await storage.createFirmaRequest({ documentId, firmantes, signatureRequestId, estado: "pendiente" });
      await storage.updateDocument(documentId, { estado: "revision" });
      res.json(firmaReq);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/signature/webhook", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/firma/:documentId/status", async (req, res) => {
    res.json(await storage.getFirmaRequests(req.params.documentId));
  });

  // ──────────────────────────────────────────
  // CASES
  // ──────────────────────────────────────────
  app.get("/api/cases", async (req, res) => {
    const userId = getUserId(req);
    const { orgId, role } = await getOrgCtx(userId);
    // assistants/interns only see their own cases; senior/admin see all org cases
    if (orgId && hasRoleAtLeast(role, "senior")) {
      return res.json(await storage.getCases(userId, orgId));
    }
    res.json(await storage.getCases(userId));
  });

  app.post("/api/cases", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { orgId } = await getOrgCtx(userId);
      const c = await storage.createCase({ ...req.body, userId, orgId: orgId ?? undefined });
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
    const { orgId } = await getOrgCtx(userId);
    res.json(await storage.getDeadlines(userId, orgId ?? undefined));
  });

  app.post("/api/deadlines", async (req, res) => {
    const userId = getUserId(req);
    const { orgId } = await getOrgCtx(userId);
    const d = await storage.createDeadline({ ...req.body, userId, orgId: orgId ?? undefined });
    res.status(201).json(d);
  });

  app.put("/api/deadlines/:id", async (req, res) => {
    const updated = await storage.updateDeadline(req.params.id, req.body);
    res.json(updated);
  });

  return httpServer;
}
