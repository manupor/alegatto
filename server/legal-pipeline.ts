/**
 * LexAI CR — 3-Layer Legal Retrieval Pipeline
 *
 * Layer A: Article number detection → O(1) in-memory lookup
 * Layer B: Keyword/theme detection → in-memory normalized search
 * Layer C: PostgreSQL FTS (plainto_tsquery Spanish) for semantic coverage
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────

export interface LegalArticle {
  id: string;
  fuente: string;
  materia: string;
  articulo: string | null;
  contenido: string;
}

// ── In-memory cache (loaded once on first request) ───────

let cacheLoaded = false;
const codeCache: Record<string, LegalArticle[]> = {};       // fuente → articles[]
const codeIndex: Record<string, Map<string, LegalArticle>> = {}; // fuente → Map<artNum, article>
let allArticles: LegalArticle[] = [];

export async function ensureCacheLoaded() {
  if (cacheLoaded) return;
  cacheLoaded = true;

  try {
    const result = await db.execute(sql`
      SELECT id, fuente, materia, articulo, contenido FROM documents ORDER BY fuente, articulo
    `);
    const rows = (Array.isArray(result) ? result : (result as any).rows ?? []) as LegalArticle[];

    for (const row of rows) {
      if (!codeCache[row.fuente]) {
        codeCache[row.fuente] = [];
        codeIndex[row.fuente] = new Map();
      }
      codeCache[row.fuente].push(row);
      if (row.articulo) {
        // Normalize key: "Artículo 82" → "82"
        const numMatch = row.articulo.match(/(\d+)/);
        if (numMatch) {
          codeIndex[row.fuente].set(numMatch[1], row);
        }
      }
    }
    allArticles = rows;
    console.log(`[LegalPipeline] Loaded ${rows.length} articles into memory from ${Object.keys(codeCache).length} legal codes`);
  } catch (e) {
    console.error("[LegalPipeline] Cache load failed:", e);
    cacheLoaded = false;
  }
}

// ── Normalization ────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Article number regex patterns ─────────────────────────

const ARTICLE_PATTERNS = [
  /art[íi]culo[s]?\s*\.?\s*(\d+)\s*(?:al|a|-|–)?\s*(\d+)?/gi,
  /arts?\s*\.?\s*(\d+)\s*(?:al|a|-|–)?\s*(\d+)?/gi,
  /\bart\.?\s*(\d+)\b/gi,
];

function detectArticleNumbers(text: string): number[] {
  const nums = new Set<number>();
  for (const pattern of ARTICLE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const from = parseInt(match[1]);
      const to = match[2] ? parseInt(match[2]) : from;
      if (!isNaN(from)) {
        for (let n = from; n <= Math.min(to, from + 10); n++) nums.add(n);
      }
    }
  }
  return Array.from(nums);
}

// Maps article numbers to the most likely legal code from conversation context
function detectFuenteFromHistory(messages: { role: string; content: string }[], prompt: string): string | null {
  const combined = normalizeText([prompt, ...messages.map(m => m.content)].join(" "));

  const codeHints: [string, string[]][] = [
    ["Código Civil de Costa Rica (Ley 63/1887)", ["codigo civil", "civil", "propiedad", "contratos", "herencia", "obligaciones", "prescripcion"]],
    ["Código Penal de Costa Rica N° 4573", ["codigo penal", "penal", "delito", "pena", "prision", "homicidio", "robo", "hurto", "estafa", "fraude"]],
    ["Código Procesal Penal de Costa Rica N° 7594", ["procesal penal", "proceso penal", "imputado", "fiscal", "tribunal", "juicio oral", "medida cautelar"]],
    ["Código de Comercio de Costa Rica N° 3284", ["comercio", "comercial", "sociedad anonima", "empresa", "facturas", "cheque", "letra de cambio"]],
    ["Constitución Política de Costa Rica (1949)", ["constitucion", "derechos fundamentales", "garantias", "sala cuarta", "constitucional", "amparo"]],
    ["Ley General de la Administración Pública N° 6227", ["administracion publica", "administracion", "gobierno", "ministerio", "decreto", "reglamento"]],
    ["Ley de Tránsito por Vías Públicas N° 9078", ["transito", "transporte", "vehiculo", "licencia de conducir", "accidente de transito", "multa de transito"]],
    ["Ley RAC — Resolución Alterna de Conflictos N° 7727", ["arbitraje", "mediacion", "conciliacion", "rac", "resolucion alterna"]],
  ];

  let bestFuente: string | null = null;
  let bestScore = 0;
  for (const [fuente, hints] of codeHints) {
    const score = hints.filter(h => combined.includes(h)).length;
    if (score > bestScore) { bestScore = score; bestFuente = fuente; }
  }
  return bestFuente;
}

// ── LAYER A: Article number lookup ────────────────────────

async function layerA(
  prompt: string,
  historyMsgs: { role: string; content: string }[],
): Promise<LegalArticle[]> {
  const nums = detectArticleNumbers(prompt);
  if (nums.length === 0) return [];

  const results: LegalArticle[] = [];
  const seen = new Set<string>();
  const detectedFuente = detectFuenteFromHistory(historyMsgs, prompt);

  // 1. Try in-memory O(1) lookup
  const searchFuentes = detectedFuente
    ? [detectedFuente, ...Object.keys(codeIndex).filter(f => f !== detectedFuente)]
    : Object.keys(codeIndex);

  for (const num of nums) {
    const numStr = String(num);
    for (const fuente of searchFuentes) {
      const art = codeIndex[fuente]?.get(numStr);
      if (art && !seen.has(art.id)) {
        results.push(art);
        seen.add(art.id);
        if (results.length >= 6) break;
      }
    }
    if (results.length >= 6) break;
  }

  // 2. Fallback: DB regex query for any missed numbers
  if (results.length < nums.length && nums.length <= 5) {
    for (const num of nums.slice(0, 3)) {
      if (results.some(r => r.articulo?.includes(String(num)))) continue;
      try {
        const pattern = `Artículo ${num}`;
        let dbResult: any;
        if (detectedFuente) {
          dbResult = await db.execute(sql`
            SELECT id, fuente, materia, articulo, contenido FROM documents
            WHERE articulo ILIKE ${`%${pattern}%`} AND fuente = ${detectedFuente}
            LIMIT 2
          `);
        } else {
          dbResult = await db.execute(sql`
            SELECT id, fuente, materia, articulo, contenido FROM documents
            WHERE articulo ILIKE ${`%${pattern}%`}
            LIMIT 3
          `);
        }
        const rows = Array.isArray(dbResult) ? dbResult : (dbResult as any).rows ?? [];
        for (const row of rows) {
          if (!seen.has(row.id)) { results.push(row); seen.add(row.id); }
        }
      } catch (_) {}
    }
  }

  return results.slice(0, 6);
}

// ── LAYER B: Keyword/theme detection ─────────────────────

interface ThemePattern {
  topic: string;
  patterns: string[];
  mateias: string[];
}

const THEME_PATTERNS: ThemePattern[] = [
  // Penal
  { topic: "homicidio", patterns: ["homicidio", "matar", "muerte dolosa", "asesinato"], mateias: ["Penal"] },
  { topic: "robo_hurto", patterns: ["robo", "hurto", "sustraccion", "robar", "hurtar"], mateias: ["Penal"] },
  { topic: "estafa_fraude", patterns: ["estafa", "fraude", "defraudar", "engano", "falsa promesa"], mateias: ["Penal"] },
  { topic: "violencia_domestica", patterns: ["violencia domestica", "violencia de genero", "medida de proteccion", "maltrato"], mateias: ["Penal"] },
  { topic: "drogas", patterns: ["drogas", "narcotrafico", "estupefaciente", "psicoactivo", "marihuana", "cocaina"], mateias: ["Penal"] },
  { topic: "delitos_sexuales", patterns: ["abuso sexual", "violacion", "acoso sexual", "estupro", "pornografia infantil"], mateias: ["Penal"] },
  // Civil
  { topic: "contrato", patterns: ["contrato", "acuerdo", "clausula", "incumplimiento", "nulidad del contrato"], mateias: ["Civil"] },
  { topic: "herencia_sucesion", patterns: ["herencia", "sucesion", "testamento", "heredero", "albacea", "legado"], mateias: ["Civil"] },
  { topic: "propiedad", patterns: ["propiedad", "bien inmueble", "terreno", "posesion", "derecho real", "registro"], mateias: ["Civil"] },
  { topic: "prescripcion", patterns: ["prescripcion", "caducidad", "plazo", "vencimiento del plazo"], mateias: ["Civil", "Procesal Penal"] },
  { topic: "obligaciones", patterns: ["obligacion", "deuda", "acreedor", "deudor", "pago", "mora", "incumplimiento"], mateias: ["Civil"] },
  { topic: "responsabilidad_civil", patterns: ["responsabilidad civil", "dano y perjuicio", "indemnizacion", "reparacion del dano"], mateias: ["Civil"] },
  // Comercial
  { topic: "sociedad_anonima", patterns: ["sociedad anonima", "sociedad de responsabilidad", "personeria juridica", "capital social", "acciones"], mateias: ["Comercial"] },
  { topic: "cheque", patterns: ["cheque", "letra de cambio", "pagare", "titulo valor"], mateias: ["Comercial"] },
  { topic: "quiebra", patterns: ["quiebra", "concurso de acreedores", "insolvencia", "liquidacion judicial"], mateias: ["Comercial"] },
  // Procesal Penal
  { topic: "detencion", patterns: ["detencion", "arresto", "prision preventiva", "detenido", "privacion de libertad"], mateias: ["Procesal Penal"] },
  { topic: "juicio_oral", patterns: ["juicio oral", "debate", "audiencia", "tribunal de juicio", "sentencia condenatoria"], mateias: ["Procesal Penal"] },
  { topic: "recurso", patterns: ["apelacion", "casacion", "recurso de revision", "impugnar"], mateias: ["Procesal Penal", "Procesal Civil"] },
  { topic: "imputado", patterns: ["imputado", "acusado", "defensor publico", "defensa tecnica"], mateias: ["Procesal Penal"] },
  // Constitucional
  { topic: "amparo", patterns: ["recurso de amparo", "amparo", "sala cuarta", "sala constitucional", "habeas corpus"], mateias: ["Constitucional"] },
  { topic: "derechos_fundamentales", patterns: ["derechos fundamentales", "garantias constitucionales", "debido proceso", "igualdad ante la ley"], mateias: ["Constitucional"] },
  // Administrativo
  { topic: "acto_administrativo", patterns: ["acto administrativo", "recurso administrativo", "recurso de revocatoria", "recurso jerarquico"], mateias: ["Administrativo"] },
  { topic: "licitacion", patterns: ["licitacion", "contratacion administrativa", "concurso", "oferta publica"], mateias: ["Administrativo"] },
  // Tránsito
  { topic: "accidente_transito", patterns: ["accidente de transito", "choque", "colision", "atropello", "accidente vial"], mateias: ["Tránsito"] },
  { topic: "licencia", patterns: ["licencia de conducir", "brevete", "suspension de licencia", "licencia de conduccion"], mateias: ["Tránsito"] },
  // RAC
  { topic: "arbitraje", patterns: ["arbitraje", "arbitro", "laudo arbitral", "tribunal arbitral"], mateias: ["Procesal Civil"] },
  { topic: "mediacion", patterns: ["mediacion", "mediador", "conciliacion", "resolucion alternativa", "acuerdo conciliatorio"], mateias: ["Procesal Civil"] },
];

function layerB(prompt: string, historyMsgs: { role: string; content: string }[], alreadyFoundIds: Set<string>): LegalArticle[] {
  const combined = normalizeText([prompt, ...historyMsgs.slice(-4).map(m => m.content)].join(" "));
  const results: LegalArticle[] = [];
  const seen = new Set<string>(alreadyFoundIds);

  const matchedTopics: ThemePattern[] = [];
  for (const theme of THEME_PATTERNS) {
    if (theme.patterns.some(p => combined.includes(normalizeText(p)))) {
      matchedTopics.push(theme);
    }
  }

  for (const theme of matchedTopics) {
    // Search relevant legal codes for this topic
    const relevantFuentes = Object.keys(codeCache).filter(fuente =>
      theme.mateias.some(m => fuente.toLowerCase().includes(m.toLowerCase()) || allArticles.find(a => a.fuente === fuente && a.materia === m))
    );

    for (const fuente of relevantFuentes) {
      const articles = codeCache[fuente] || [];
      for (const art of articles) {
        if (seen.has(art.id)) continue;
        const normalContent = normalizeText(art.contenido);
        const matches = theme.patterns.filter(p => normalContent.includes(normalizeText(p))).length;
        if (matches > 0) {
          results.push(art);
          seen.add(art.id);
          if (results.length >= 6) break;
        }
      }
      if (results.length >= 6) break;
    }
    if (results.length >= 6) break;
  }

  return results.slice(0, 6);
}

// ── LAYER C: PostgreSQL FTS ───────────────────────────────

async function layerC(prompt: string, materias: string[] | undefined, alreadyFoundIds: Set<string>, limit = 5): Promise<LegalArticle[]> {
  try {
    let result: any;
    if (materias && materias.length > 0) {
      const materiasLiteral = materias.map(m => `'${m.replace(/'/g, "''")}'`).join(",");
      result = await db.execute(sql`
        SELECT id, fuente, materia, articulo, contenido,
          ts_rank(to_tsvector('spanish', contenido), plainto_tsquery('spanish', ${prompt})) AS score
        FROM documents
        WHERE to_tsvector('spanish', contenido) @@ plainto_tsquery('spanish', ${prompt})
          AND materia = ANY(ARRAY[${sql.raw(materiasLiteral)}])
        ORDER BY score DESC
        LIMIT ${limit * 2}
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, fuente, materia, articulo, contenido,
          ts_rank(to_tsvector('spanish', contenido), plainto_tsquery('spanish', ${prompt})) AS score
        FROM documents
        WHERE to_tsvector('spanish', contenido) @@ plainto_tsquery('spanish', ${prompt})
        ORDER BY score DESC
        LIMIT ${limit * 2}
      `);
    }

    const rows: any[] = Array.isArray(result) ? result : (result as any).rows ?? [];
    return rows
      .filter(r => !alreadyFoundIds.has(r.id) && parseFloat(r.score) > 0.02)
      .slice(0, limit);
  } catch (e) {
    console.error("[LayerC] FTS error:", e);
    return [];
  }
}

// ── Context assembly ─────────────────────────────────────

function assembleContext(layerAResults: LegalArticle[], layerBResults: LegalArticle[], layerCResults: LegalArticle[]): string {
  if (layerAResults.length === 0 && layerBResults.length === 0 && layerCResults.length === 0) {
    return "";
  }

  let ctx = "═══ CONTEXTO LEGAL DE COSTA RICA (GROUND TRUTH) ═══\n\n";

  const addSection = (articles: LegalArticle[], label: string) => {
    if (articles.length === 0) return;
    for (const art of articles) {
      const artLabel = art.articulo ? `**${art.articulo}**` : "";
      ctx += `**${art.fuente}**${artLabel ? " — " + artLabel : ""}\n`;
      ctx += `> ${art.contenido.substring(0, 800).replace(/\n/g, "\n> ")}\n\n---\n`;
    }
  };

  addSection(layerAResults, "A");
  addSection(layerBResults, "B");
  addSection(layerCResults, "C");
  ctx += "═══════════════════════════════════════════════════\n";
  return ctx;
}

// ── Mode detection ────────────────────────────────────────

function detectMode(prompt: string): { isAnalysis: boolean; isReview: boolean } {
  const lower = prompt.toLowerCase();
  const isAnalysis =
    lower.includes("analiza") || lower.includes("redacta") || lower.includes("revisa") ||
    lower.includes("elabora") || lower.includes("prepara") || prompt.length > 200;
  const isReview =
    lower.includes("riesgo procesal") || lower.includes("auditor") ||
    lower.includes("prescripci") || lower.includes("caduc") || lower.includes("revision legal");
  return { isAnalysis, isReview };
}

// ── System prompt ────────────────────────────────────────

export const LEGAL_SYSTEM_PROMPT = `Eres LexAI CR, el asistente legal de inteligencia artificial especializado en el ordenamiento jurídico de Costa Rica. Estás aquí para ayudar a abogados, bufetes y profesionales del derecho costarricense.

INSTRUCCIONES FUNDAMENTALES:
1. Responde SIEMPRE en español formal jurídico costarricense
2. Basa tus respuestas en el contexto legal provisto (GROUND TRUTH) — si el artículo está en el contexto, cítalo textualmente
3. Si el contexto no cubre la pregunta, indica expresamente qué normativa aplicaría y recomienda verificar en el SINALEVI o con la Procuraduría General
4. Estructura tu respuesta con: (a) norma aplicable, (b) análisis jurídico, (c) consecuencias o recomendaciones
5. NUNCA inventes artículos o citas que no estén en el contexto legal provisto
6. Indica siempre la fuente: Ley, Código, artículo específico

FORMATO DE RESPUESTA:
Al final de cada respuesta, incluye un bloque de metadatos:
---
**Materia**: [CONSTITUCIONAL/CIVIL/PENAL/PROCESAL_PENAL/COMERCIAL/ADMINISTRATIVO/TRANSITO/PROCESAL_CIVIL]
**Riesgo Procesal**: [BAJO/MEDIO/ALTO/N/A]
**Normativa citada**: [lista de leyes y artículos]`;

// ── Main pipeline ─────────────────────────────────────────

export async function runLegalPipeline(
  prompt: string,
  historyMessages: { role: string; content: string }[],
  materias: string[] | undefined,
): Promise<{ groundedMessage: string; contextStr: string; layerStats: { a: number; b: number; c: number } }> {
  await ensureCacheLoaded();

  // Layer A — Article number detection
  const layerAResults = await layerA(prompt, historyMessages);
  const foundIds = new Set(layerAResults.map(r => r.id));

  // Layer B — Keyword/theme detection
  const layerBResults = layerB(prompt, historyMessages, foundIds);
  for (const r of layerBResults) foundIds.add(r.id);

  // Layer C — FTS semantic search (always runs)
  const layerCResults = await layerC(prompt, materias, foundIds, 5);

  const contextStr = assembleContext(layerAResults, layerBResults, layerCResults);
  const { isAnalysis, isReview } = detectMode(prompt);

  let modeInstructions = "";
  if (isAnalysis) {
    modeInstructions = "\n\n[MODO ANÁLISIS: El usuario solicita análisis detallado o redacción. Sé exhaustivo, cita artículos específicos y estructura el análisis en secciones claras.]";
  }
  if (isReview) {
    modeInstructions += "\n\n[MODO REVISIÓN: El usuario solicita revisión de riesgos. Identifica expresamente plazos, prescripciones y riesgos procesales.]";
  }

  const groundedMessage = contextStr
    ? `📚 ${contextStr}${modeInstructions}\n\nCONSULTA DEL USUARIO: ${prompt}`
    : `${modeInstructions ? modeInstructions + "\n\n" : ""}CONSULTA DEL USUARIO: ${prompt}`;

  return {
    groundedMessage,
    contextStr,
    layerStats: {
      a: layerAResults.length,
      b: layerBResults.length,
      c: layerCResults.length,
    },
  };
}
