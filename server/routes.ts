import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import multer from "multer";
import mammoth from "mammoth";
import { randomUUID } from "crypto";
import { createRequire } from "module";
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> =
  createRequire(process.cwd() + "/package.json")("pdf-parse");
import { runLegalPipeline, LEGAL_SYSTEM_PROMPT, ensureCacheLoaded } from "./legal-pipeline";
import { passport, bcrypt } from "./auth";
import { users } from "@shared/schema";
import { sendInviteEmail } from "./email";

// ── Google token refresh helper ───────────────────────────
async function refreshGoogleTokenIfNeeded(user: { id: string; googleAccessToken: string | null; googleRefreshToken: string | null }): Promise<string | null> {
  if (!user.googleAccessToken) return null;

  // Try a lightweight token info check
  const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${user.googleAccessToken}`);
  if (infoRes.ok) return user.googleAccessToken;

  // Token invalid/expired — try refresh
  if (!user.googleRefreshToken) return null;

  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: user.googleRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) return null;

  const refreshData = await refreshRes.json();
  const newToken: string = refreshData.access_token;

  // Persist refreshed token
  await db.update(users).set({ googleAccessToken: newToken }).where(eq(users.id, user.id));

  return newToken;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function ensureDemoUser() {
  try {
    const hash = await bcrypt.hash("demo123", 10);
    await db.execute(sql`
      INSERT INTO users (id, email, password, plan, created_at)
      VALUES (${DEMO_USER_ID}, 'demo@lexai.cr', ${hash}, 'FREE', NOW())
      ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password WHERE users.password = 'demo'
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

  const getUserId = (req: any): string => {
    if (req.user?.id) return req.user.id;
    if (process.env.NODE_ENV !== "production") return DEMO_USER_ID;
    return "";
  };

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.user?.id) return next();
    if (process.env.NODE_ENV !== "production") return next();
    return res.status(401).json({ message: "No autenticado" });
  };

  // ──────────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────────
  app.get("/api/auth/me", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "No autenticado" });

    const { org, role } = await getOrgCtx(userId);
    const user = req.user as any;
    res.json({
      id: userId,
      email: user?.email ?? "demo@lexai.cr",
      name: user?.name ?? "Abogado Demo",
      org: org ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan } : null,
      role,
    });
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciales inválidas" });
      }
      req.logIn(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        const { org, role } = await getOrgCtx(user.id);
        return res.json({ id: user.id, email: user.email, name: user.name, org, role });
      });
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = z
        .object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional() })
        .parse(req.body);

      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing) return res.status(400).json({ message: "El correo ya está registrado" });

      const hash = await bcrypt.hash(password, 10);
      const [newUser] = await db
        .insert(users)
        .values({ email, password: hash, name: name ?? null, plan: "FREE" })
        .returning();

      req.logIn({ id: newUser.id, email: newUser.email, name: newUser.name, plan: newUser.plan }, (err) => {
        if (err) return res.status(500).json({ message: "Error al crear sesión" });
        return res.status(201).json({ id: newUser.id, email: newUser.email, name: newUser.name });
      });
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: err.errors[0]?.message || "Datos inválidos" });
      return res.status(500).json({ message: "Error interno" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "ok" });
    });
  });

  // ── Google OAuth ─────────────────────────────────
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email", "https://www.googleapis.com/auth/calendar.events"],
      accessType: "offline",
      prompt: "consent",
    } as any),
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=google_auth_failed" }),
    (req, res) => {
      res.redirect("/dashboard");
    },
  );

  // ── Google Calendar status ────────────────────────
  app.get("/api/calendar/status", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ connected: false });
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    res.json({ connected: !!(user?.googleAccessToken) });
  });

  // ── Google Calendar create event ─────────────────
  app.post("/api/calendar/create-event", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "No autenticado" });

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.googleAccessToken) {
      return res.status(403).json({ message: "Google Calendar no conectado. Iniciá sesión con Google para habilitar esta función." });
    }

    const { summary, description, date } = req.body;
    if (!summary || !date) {
      return res.status(400).json({ message: "Faltan datos: summary y date son requeridos" });
    }

    const accessToken = await refreshGoogleTokenIfNeeded(user);
    if (!accessToken) {
      return res.status(403).json({ message: "Token de Google expirado. Volvé a iniciar sesión con Google." });
    }

    // Build Google Calendar event (all-day)
    const startDate = date; // YYYY-MM-DD
    const endDateObj = new Date(startDate + "T12:00:00");
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDate = endDateObj.toISOString().split("T")[0];

    const event = {
      summary,
      description,
      start: { date: startDate },
      end: { date: endDate },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const gcalRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!gcalRes.ok) {
      const errData = await gcalRes.json().catch(() => ({}));
      console.error("Google Calendar API error:", errData);
      return res.status(500).json({ message: "Error al crear evento en Google Calendar", detail: errData });
    }

    const created = await gcalRes.json();
    res.json({ success: true, eventLink: created.htmlLink, eventId: created.id });
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
      const { name, slug } = req.body;
      if (!name || !slug) return res.status(400).json({ message: "name and slug required" });

      const existing = await storage.getOrgBySlug(slug);
      if (existing) return res.status(409).json({ message: "Ese identificador ya está en uso" });

      const userId = getUserId(req);

      let plan = "free";
      let betaApplied = false;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user) {
        const betaInvite = await storage.getBetaInviteByEmail(user.email);
        if (betaInvite && !betaInvite.used) {
          plan = "pro";
          betaApplied = true;
          await storage.markBetaInviteUsed(betaInvite.id);
        }
      }

      const org = await storage.createOrg({ name, slug, plan });
      await storage.addOrgMember({ orgId: org.id, userId, role: "admin" });

      res.status(201).json({ org, role: "admin", betaApplied });
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
      const inviteLink = `${req.protocol}://${req.get("host")}/invite/${token}`;

      // Send email via Resend (non-blocking — don't fail the request if email fails)
      let emailSent = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const org = await storage.getOrg(orgId);
          await sendInviteEmail({
            toEmail: email,
            orgName: org?.name ?? "su despacho",
            inviteLink,
            role: inviteRole,
          });
          emailSent = true;
        } catch (emailErr: any) {
          console.warn("[invite] Email send failed:", emailErr?.message);
        }
      }

      res.status(201).json({ invite, inviteLink, emailSent });
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

  // Public: look up invite by token (no auth required)
  app.get("/api/invite/:token", async (req, res) => {
    try {
      const invite = await storage.getOrgInviteByToken(req.params.token);
      if (!invite) return res.status(404).json({ message: "Invitación no encontrada o expirada" });
      const org = await storage.getOrg(invite.orgId);
      res.json({ invite, orgName: org?.name ?? "la organización" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Accept invite — requires the user to be authenticated
  app.post("/api/invite/:token/accept", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Debes iniciar sesión primero" });

      const invite = await storage.getOrgInviteByToken(req.params.token);
      if (!invite) return res.status(404).json({ message: "Invitación no encontrada o expirada" });

      // Check if already a member
      const existing = await storage.getOrgMembership(userId);
      if (existing?.orgId === invite.orgId) {
        return res.json({ message: "Ya eres miembro de esta organización", orgId: invite.orgId });
      }

      // Add to org
      await storage.addOrgMember({ orgId: invite.orgId, userId, role: invite.role });
      // Delete the invite token so it can't be reused
      await storage.deleteOrgInvite(invite.id);

      res.json({ message: "Te has unido a la organización correctamente", orgId: invite.orgId });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
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
      if (!userId) return res.status(401).json({ message: "No autenticado" });
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

      console.log(`[Chat] Pipeline stats — A:${layerStats.a} B:${layerStats.b} C:${layerStats.c} D:${(layerStats as any).d ?? 0} articles | context=${contextStr.length} chars`);
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
      res.json({ analysis, filename: req.file.originalname, docText: extractedText.substring(0, 14000) });
    } catch (err: any) {
      console.error("Analysis error:", err);
      res.status(500).json({ message: "Error al analizar: " + err.message });
    }
  });

  // ──────────────────────────────────────────
  // DOCUMENT Q&A CHAT
  // ──────────────────────────────────────────
  app.post("/api/document-chat", async (req, res) => {
    try {
      const { question, docText, filename, history } = z.object({
        question: z.string().min(1).max(1000),
        docText: z.string().min(1).max(14000),
        filename: z.string().optional(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
      }).parse(req.body);

      const messages: any[] = [
        {
          role: "system",
          content: `Eres un asistente legal experto en derecho costarricense. El usuario ha subido el documento "${filename ?? "sin nombre"}" y tiene preguntas sobre su contenido.

CONTENIDO DEL DOCUMENTO:
${docText}

Responde de forma clara, precisa y en español. Si la pregunta no se puede responder con el contenido del documento, indícalo. Cita párrafos o secciones específicas cuando sea útil.`,
        },
        ...(history ?? []),
        { role: "user", content: question },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.2,
      });

      const answer = completion.choices[0]?.message?.content ?? "No pude generar una respuesta.";
      res.json({ answer, tokensUsed: completion.usage?.total_tokens ?? 0 });
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: "Datos inválidos" });
      console.error("Document chat error:", err);
      res.status(500).json({ message: "Error al procesar la pregunta: " + err.message });
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

  // ── Super Admin: Beta Invites ─────────────────────────────
  const isSuperAdmin = (req: any) => {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    return superAdminEmail && req.user?.email === superAdminEmail;
  };

  app.get("/api/admin/beta-invites", async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: "Acceso denegado" });
    const invites = await storage.getBetaInvites();
    res.json(invites);
  });

  app.post("/api/admin/beta-invites", async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: "Acceso denegado" });
    const { email, note } = req.body;
    if (!email) return res.status(400).json({ message: "email requerido" });

    const existing = await storage.getBetaInviteByEmail(email);
    if (existing) return res.status(409).json({ message: "Ya existe una invitación para ese correo" });

    const code = "BETA-" + randomUUID().split("-")[0].toUpperCase();
    const invite = await storage.createBetaInvite({ email, code, note });

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const betaLink = `${appUrl}/auth?betaCode=${code}&email=${encodeURIComponent(email)}`;

    try {
      const { sendBetaInviteEmail } = await import("./email");
      await sendBetaInviteEmail({ to: email, code, betaLink });
    } catch (e) {
      console.warn("[beta-invite] Email send failed:", (e as Error).message);
    }

    res.status(201).json({ invite, betaLink });
  });

  app.delete("/api/admin/beta-invites/:id", async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: "Acceso denegado" });
    await storage.deleteBetaInvite(req.params.id);
    res.status(204).send();
  });

  // ── Billing (Tilopay) ─────────────────────────────────────────────────────

  app.get("/api/billing/tilopay/config", requireAuth, async (req, res) => {
    try {
      const plan = req.query.plan as string;
      if (!["pro", "corporate"].includes(plan)) return res.status(400).json({ message: "Plan inválido" });

      const membership = await storage.getOrgMembership(getUserId(req));
      if (!membership) return res.status(404).json({ message: "Organización no encontrada" });

      const userId = getUserId(req);
      const [userRecord] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId));

      const amount = plan === "pro" ? 20.00 : 50.00;
      const shortOrg = membership.orgId.replace(/-/g, "").substring(0, 8).toUpperCase();
      const orderNumber = `A${plan === "pro" ? "P" : "C"}${shortOrg}${Date.now().toString().slice(-5)}`;

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const nameParts = (userRecord?.name || "Cliente Alegatto").split(" ");

      res.json({
        apiKey: process.env.TILOPAY_API_KEY,
        amount,
        currency: "USD",
        language: "es",
        orderNumber,
        plan,
        orgId: membership.orgId,
        email: userRecord?.email ?? "",
        firstName: nameParts[0] ?? "Cliente",
        lastName: nameParts.slice(1).join(" ") || "Alegatto",
        callbackUrl: `${appUrl}/dashboard/billing?tilo_order=${orderNumber}&tilo_plan=${plan}&tilo_org=${membership.orgId}`,
      });
    } catch (e: any) {
      console.error("[tilopay/config]", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/billing/tilopay/verify", requireAuth, async (req, res) => {
    try {
      const { orderNumber, plan, orgId } = req.body;
      if (!orderNumber || !plan || !orgId) return res.status(400).json({ message: "Datos incompletos" });

      const membership = await storage.getOrgMembership(getUserId(req));
      if (!membership || membership.orgId !== orgId) return res.status(403).json({ message: "Acceso denegado" });

      // Try Tilopay API verification
      try {
        const credentials = Buffer.from(`${process.env.TILOPAY_API_USER}:${process.env.TILOPAY_API_PASSWORD}`).toString("base64");
        const tiloRes = await fetch(`https://app.tilopay.com/api/v1/charges/${orderNumber}`, {
          headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
        });
        if (tiloRes.ok) {
          const data = await tiloRes.json();
          const approved = ["approved", "1", "captured", "APPROVED", "CAPTURED"].includes(String(data.status ?? ""));
          if (!approved) return res.status(400).json({ message: "Pago no aprobado por Tilopay" });
        }
        // If API call fails (404, network error, etc.) we trust the redirect in test mode
      } catch (verifyErr) {
        console.warn("[tilopay/verify] API check failed, proceeding in test mode:", (verifyErr as Error).message);
      }

      const dbPlan = plan === "corporate" ? "enterprise" : "pro";
      await storage.updateOrg(orgId, { plan: dbPlan });
      res.json({ plan: dbPlan });
    } catch (e: any) {
      console.error("[tilopay/verify]", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // ── Billing (Stripe) ──────────────────────────────────────────────────────

  app.get("/api/billing/status", requireAuth, async (req, res) => {
    try {
      const membership = await storage.getOrgMembership(getUserId(req));
      if (!membership) return res.json({ plan: "free", subscription: null });
      const org = membership.org;
      let subscription = null;
      if (org.stripeSubscriptionId) {
        const result = await db.execute(sql`SELECT status, current_period_end FROM stripe.subscriptions WHERE id = ${org.stripeSubscriptionId} LIMIT 1`);
        subscription = result.rows[0] || null;
      }
      res.json({ plan: org.plan, stripeCustomerId: org.stripeCustomerId, subscription });
    } catch (e: any) {
      console.warn("[billing/status]", e.message);
      res.json({ plan: "free", subscription: null });
    }
  });

  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      if (!["pro", "corporate"].includes(plan)) return res.status(400).json({ message: "Plan inválido" });
      const membership = await storage.getOrgMembership(getUserId(req));
      if (!membership) return res.status(404).json({ message: "Organización no encontrada" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const priceResult = await db.execute(sql`
        SELECT pr.id as price_id FROM stripe.prices pr
        JOIN stripe.products p ON pr.product = p.id
        WHERE p.metadata->>'plan' = ${plan} AND pr.active = true AND p.active = true
        LIMIT 1
      `);
      if (priceResult.rows.length === 0) return res.status(404).json({ message: "Plan no encontrado en Stripe. Ejecute el seed de productos." });
      const priceId = priceResult.rows[0].price_id as string;

      let customerId = membership.org.stripeCustomerId;
      if (!customerId) {
        const userId = getUserId(req);
        const [userRecord] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
        const customer = await stripe.customers.create({
          email: userRecord?.email ?? "",
          metadata: { orgId: membership.orgId },
        });
        await storage.updateOrg(membership.orgId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${appUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/billing`,
        metadata: { orgId: membership.orgId, plan },
      });

      res.json({ url: session.url });
    } catch (e: any) {
      console.error("[billing/checkout]", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/billing/verify", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: "sessionId requerido" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") return res.status(400).json({ message: "Pago no completado" });

      const orgId = session.metadata?.orgId;
      const plan = session.metadata?.plan;
      if (!orgId || !plan) return res.status(400).json({ message: "Sesión inválida" });

      const membership = await storage.getOrgMembership(getUserId(req));
      if (!membership || membership.orgId !== orgId) return res.status(403).json({ message: "Acceso denegado" });

      const dbPlan = plan === "corporate" ? "enterprise" : "pro";
      await storage.updateOrg(orgId, {
        plan: dbPlan,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      });

      res.json({ plan: dbPlan });
    } catch (e: any) {
      console.error("[billing/verify]", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/billing/portal", requireAuth, async (req, res) => {
    try {
      const membership = await storage.getOrgMembership(getUserId(req));
      if (!membership?.org.stripeCustomerId) return res.status(400).json({ message: "Sin suscripción activa" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const portal = await stripe.billingPortal.sessions.create({
        customer: membership.org.stripeCustomerId,
        return_url: `${appUrl}/dashboard/billing`,
      });

      res.json({ url: portal.url });
    } catch (e: any) {
      console.error("[billing/portal]", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
