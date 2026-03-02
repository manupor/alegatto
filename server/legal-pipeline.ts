/**
 * LexAI CR — 3-Layer Legal Retrieval Pipeline
 *
 * Layer A: Article number detection → in-memory lookup (all sub-chunks)
 * Layer B: Keyword/theme detection → in-memory normalized search by materia
 * Layer C: PostgreSQL FTS (plainto_tsquery Spanish) for semantic coverage
 */
import { db } from "./db";
import { sql } from "drizzle-orm";
import { rawDocuments } from "@shared/schema";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

export interface LegalArticle {
  id: string;
  fuente: string;
  materia: string;
  articulo: string | null;
  contenido: string;
}

function extractRows(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result?.rows && Array.isArray(result.rows)) return result.rows;
  if (result && typeof result === "object" && typeof result[Symbol.iterator] === "function") return [...result];
  return [];
}

// ── In-memory cache ──────────────────────────────────────

let cacheLoaded = false;
const codeCache: Record<string, LegalArticle[]> = {};
// Maps fuente → artNum → ALL matching articles (including sub-chunks)
const codeIndex: Record<string, Map<string, LegalArticle[]>> = {};
// Maps materia → fuente for fast materia-based lookups
const materiaToFuentes: Record<string, string[]> = {};

async function seedFromCorpusFile(): Promise<void> {
  const paths = [
    join(process.cwd(), "server", "legal-corpus.json"),
    join(process.cwd(), "legal-corpus.json"),
    join(__dirname, "legal-corpus.json"),
  ];
  let corpusPath: string | null = null;
  for (const p of paths) {
    if (existsSync(p)) { corpusPath = p; break; }
  }
  if (!corpusPath) {
    console.error("[LegalPipeline] No corpus file found, cannot seed.");
    return;
  }

  console.log(`[LegalPipeline] Seeding DB from ${corpusPath}...`);
  const articles: { fuente: string; materia: string; articulo: string | null; contenido: string }[] =
    JSON.parse(readFileSync(corpusPath, "utf-8"));

  const BATCH = 200;
  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH);
    await db.insert(rawDocuments).values(
      batch.map(a => ({
        id: randomUUID(),
        fuente: a.fuente,
        materia: a.materia,
        articulo: a.articulo,
        contenido: a.contenido,
      }))
    );
  }
  console.log(`[LegalPipeline] Seeded ${articles.length} articles into DB`);
}

function buildCacheFromRows(rows: LegalArticle[]) {
  for (const row of rows) {
    if (!codeCache[row.fuente]) {
      codeCache[row.fuente] = [];
      codeIndex[row.fuente] = new Map();
    }
    codeCache[row.fuente].push(row);

    if (row.articulo) {
      const numMatch = row.articulo.match(/^(?:Art[íi]culo|ARTICULO)\s+(\d+)/i);
      if (numMatch) {
        const key = numMatch[1];
        const arr = codeIndex[row.fuente].get(key) || [];
        arr.push(row);
        codeIndex[row.fuente].set(key, arr);
      }
    }

    const materiaKey = row.materia;
    if (!materiaToFuentes[materiaKey]) materiaToFuentes[materiaKey] = [];
    if (!materiaToFuentes[materiaKey].includes(row.fuente)) {
      materiaToFuentes[materiaKey].push(row.fuente);
    }
    const materiaKeyNorm = normalizeText(materiaKey);
    if (materiaKeyNorm !== materiaKey && !materiaToFuentes[materiaKeyNorm]) {
      materiaToFuentes[materiaKeyNorm] = materiaToFuentes[materiaKey];
    }
  }
}

function findCorpusFile(): string | null {
  const paths = [
    join(process.cwd(), "server", "legal-corpus.json"),
    join(process.cwd(), "legal-corpus.json"),
    join(__dirname, "legal-corpus.json"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

const EXPECTED_ARTICLE_COUNT = 4482;

export async function ensureCacheLoaded() {
  if (cacheLoaded) return;
  cacheLoaded = true;

  try {
    const corpusPath = findCorpusFile();
    if (corpusPath) {
      const articles = JSON.parse(readFileSync(corpusPath, "utf-8")) as Omit<LegalArticle, "id">[];
      buildCacheFromRows(articles.map((a, i) => ({ ...a, id: `corpus-${i}` })));
      console.log(`[LegalPipeline] Loaded ${articles.length} articles from JSON into memory`);
    } else {
      const rawResult = await db.execute(sql`
        SELECT id, fuente, materia, articulo, contenido FROM documents ORDER BY fuente, id
      `);
      const rows = extractRows(rawResult) as LegalArticle[];
      buildCacheFromRows(rows);
      console.log(`[LegalPipeline] Loaded ${rows.length} articles from DB`);
    }

    seedDbInBackground();
  } catch (e) {
    console.error("[LegalPipeline] Cache load failed:", e);
    cacheLoaded = false;
  }
}

function seedDbInBackground() {
  setTimeout(async () => {
    try {
      const countResult = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM documents`);
      const countRows = extractRows(countResult);
      const dbCount = countRows[0]?.cnt ?? 0;

      if (dbCount >= EXPECTED_ARTICLE_COUNT) {
        console.log(`[LegalPipeline] DB already has ${dbCount} articles, no seed needed`);
        return;
      }

      const corpusPath = findCorpusFile();
      if (!corpusPath) {
        console.log("[LegalPipeline] No corpus file found for background seed");
        return;
      }

      if (dbCount > 0 && dbCount < EXPECTED_ARTICLE_COUNT) {
        console.log(`[LegalPipeline] DB has partial data (${dbCount}/${EXPECTED_ARTICLE_COUNT}), clearing and re-seeding...`);
        await db.execute(sql`DELETE FROM documents`);
      }

      console.log(`[LegalPipeline] Background seeding from ${corpusPath}...`);
      await seedFromCorpusFile();
      console.log("[LegalPipeline] Background seed complete");
    } catch (e) {
      console.error("[LegalPipeline] Background seed error:", e);
    }
  }, 3000);
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

// ── Fuente detection from prompt + history ────────────────

const CODE_HINTS: [string, string[]][] = [
  ["Código Civil de Costa Rica (Ley 63/1887)", ["codigo civil", "civil", "propiedad", "contratos", "herencia", "obligaciones", "prescripcion", "arrendamiento"]],
  ["Código Penal de Costa Rica N° 4573", ["codigo penal", "penal", "delito", "pena", "prision", "homicidio", "robo", "hurto", "estafa", "fraude", "lesiones"]],
  ["Código Procesal Penal de Costa Rica N° 7594", ["procesal penal", "proceso penal", "imputado", "fiscal", "tribunal penal", "juicio oral", "medida cautelar", "querella"]],
  ["Código de Comercio de Costa Rica N° 3284", ["codigo de comercio", "comercio", "comercial", "sociedad anonima", "empresa", "cheque", "letra de cambio", "mercantil"]],
  ["Constitución Política de Costa Rica (1949)", ["constitucion", "constitucional", "derechos fundamentales", "garantias", "sala cuarta", "amparo", "habeas corpus"]],
  ["Ley General de la Administración Pública N° 6227", ["administracion publica", "administrativo", "gobierno", "ministerio", "decreto", "reglamento", "funcionario publico"]],
  ["Ley de Tránsito por Vías Públicas N° 9078", ["ley de transito", "transito", "vehiculo", "licencia de conducir", "accidente de transito", "multa de transito"]],
  ["Ley RAC — Resolución Alterna de Conflictos N° 7727", ["arbitraje", "mediacion", "conciliacion", "resolucion alterna", "rac"]],
];

function detectFuente(prompt: string, history: { role: string; content: string }[]): string | null {
  const combined = normalizeText([prompt, ...history.map(m => m.content)].join(" "));

  let bestFuente: string | null = null;
  let bestScore = 0;
  for (const [fuente, hints] of CODE_HINTS) {
    let score = 0;
    for (const h of hints) {
      if (combined.includes(h)) {
        score += h.includes(" ") ? 3 : 1;
      }
    }
    if (score > bestScore) { bestScore = score; bestFuente = fuente; }
  }
  return bestScore >= 1 ? bestFuente : null;
}

// ── Article number extraction ─────────────────────────────

function detectArticleNumbers(text: string): number[] {
  const nums = new Set<number>();
  const patterns = [
    /art[íi]culos?\s*\.?\s*(\d+)\s*(?:al|a|-|–)\s*(\d+)/gi,
    /art[íi]culos?\s*\.?\s*(\d+)/gi,
    /arts?\s*\.?\s*(\d+)\s*(?:al|a|-|–)\s*(\d+)/gi,
    /arts?\s*\.?\s*(\d+)/gi,
  ];
  for (const p of patterns) {
    p.lastIndex = 0;
    let m;
    while ((m = p.exec(text)) !== null) {
      const from = parseInt(m[1]);
      const to = m[2] ? parseInt(m[2]) : from;
      if (!isNaN(from) && from > 0 && from <= 9999) {
        for (let n = from; n <= Math.min(to, from + 10); n++) nums.add(n);
      }
    }
  }
  return Array.from(nums);
}

// ── LAYER A: Article number lookup ────────────────────────

async function layerA(
  prompt: string,
  history: { role: string; content: string }[],
): Promise<LegalArticle[]> {
  const nums = detectArticleNumbers(prompt);
  if (nums.length === 0) return [];

  const results: LegalArticle[] = [];
  const seen = new Set<string>();
  const detectedFuente = detectFuente(prompt, history);

  for (const num of nums) {
    const numStr = String(num);
    let foundForThisNum = false;

    if (detectedFuente) {
      const arts = codeIndex[detectedFuente]?.get(numStr) || [];
      for (const a of arts) {
        if (!seen.has(a.id)) { results.push(a); seen.add(a.id); foundForThisNum = true; }
      }
    }

    if (!foundForThisNum) {
      for (const fuente of Object.keys(codeIndex)) {
        if (fuente === detectedFuente) continue;
        const arts = codeIndex[fuente]?.get(numStr) || [];
        for (const a of arts) {
          if (!seen.has(a.id)) { results.push(a); seen.add(a.id); }
        }
        if (results.length >= 10) break;
      }
    }
  }

  // 3. DB fallback for any nums not found in memory
  for (const num of nums.slice(0, 3)) {
    if (results.some(r => r.articulo?.match(new RegExp(`\\b${num}\\b`)))) continue;
    try {
      const pattern = `%${num}%`;
      const dbResult = detectedFuente
        ? await db.execute(sql`
            SELECT id, fuente, materia, articulo, contenido FROM documents
            WHERE articulo ILIKE ${pattern} AND fuente = ${detectedFuente}
            LIMIT 3
          `)
        : await db.execute(sql`
            SELECT id, fuente, materia, articulo, contenido FROM documents
            WHERE articulo ILIKE ${pattern}
            LIMIT 3
          `);
      const rows = extractRows(dbResult);
      for (const r of rows) {
        if (!seen.has(r.id)) { results.push(r); seen.add(r.id); }
      }
    } catch (_) {}
  }

  return results.slice(0, 8);
}

// ── LAYER B: Keyword/theme detection ─────────────────────

interface ThemePattern {
  topic: string;
  keywords: string[];
  materias: string[];
}

const THEME_PATTERNS: ThemePattern[] = [
  { topic: "homicidio", keywords: ["homicidio", "matar", "muerte dolosa", "asesinato", "parricidio"], materias: ["Penal"] },
  { topic: "robo_hurto", keywords: ["robo", "hurto", "sustraccion", "robar", "hurtar", "asalto"], materias: ["Penal"] },
  { topic: "estafa_fraude", keywords: ["estafa", "fraude", "defraudar", "engano", "administracion fraudulenta"], materias: ["Penal"] },
  { topic: "violencia", keywords: ["violencia domestica", "violencia de genero", "medida de proteccion", "maltrato", "agresion"], materias: ["Penal"] },
  { topic: "drogas", keywords: ["drogas", "narcotrafico", "estupefaciente", "psicoactivo"], materias: ["Penal"] },
  { topic: "delitos_sexuales", keywords: ["abuso sexual", "violacion", "acoso sexual", "estupro"], materias: ["Penal"] },
  { topic: "lesiones", keywords: ["lesiones", "lesion grave", "lesion gravisima", "herida"], materias: ["Penal"] },
  { topic: "contrato", keywords: ["contrato", "clausula", "incumplimiento contractual", "nulidad"], materias: ["Civil"] },
  { topic: "herencia", keywords: ["herencia", "sucesion", "testamento", "heredero", "albacea", "legado", "intestado"], materias: ["Civil"] },
  { topic: "propiedad", keywords: ["propiedad", "inmueble", "terreno", "posesion", "derecho real", "registro publico"], materias: ["Civil"] },
  { topic: "prescripcion", keywords: ["prescripcion", "caducidad", "plazo prescriptivo", "vencimiento"], materias: ["Civil", "Procesal Penal"] },
  { topic: "obligaciones", keywords: ["obligacion", "deuda", "acreedor", "deudor", "pago", "mora"], materias: ["Civil"] },
  { topic: "responsabilidad", keywords: ["responsabilidad civil", "dano", "perjuicio", "indemnizacion", "reparacion"], materias: ["Civil"] },
  { topic: "familia", keywords: ["matrimonio", "divorcio", "pension alimentaria", "alimentos", "patria potestad", "guarda", "custodia"], materias: ["Civil"] },
  { topic: "sociedad", keywords: ["sociedad anonima", "sociedad de responsabilidad", "personeria juridica", "capital social"], materias: ["Comercial"] },
  { topic: "titulos_valor", keywords: ["cheque", "letra de cambio", "pagare", "titulo valor", "endoso"], materias: ["Comercial"] },
  { topic: "quiebra", keywords: ["quiebra", "concurso de acreedores", "insolvencia", "liquidacion"], materias: ["Comercial"] },
  { topic: "detencion", keywords: ["detencion", "arresto", "prision preventiva", "privacion de libertad"], materias: ["Procesal Penal"] },
  { topic: "juicio", keywords: ["juicio oral", "debate", "audiencia preliminar", "sentencia"], materias: ["Procesal Penal"] },
  { topic: "recurso", keywords: ["apelacion", "casacion", "recurso de revision", "impugnar", "recurso de apelacion"], materias: ["Procesal Penal", "Procesal Civil"] },
  { topic: "imputado", keywords: ["imputado", "acusado", "defensor", "defensa tecnica", "declaracion indagatoria"], materias: ["Procesal Penal"] },
  { topic: "amparo", keywords: ["recurso de amparo", "amparo", "sala cuarta", "sala constitucional", "habeas corpus", "inconstitucionalidad"], materias: ["Constitucional"] },
  { topic: "derechos", keywords: ["derechos fundamentales", "garantias", "debido proceso", "igualdad", "libertad de expresion", "vida humana", "derecho a la vida", "inviolable", "libertad", "dignidad"], materias: ["Constitucional"] },
  { topic: "administrativo", keywords: ["acto administrativo", "recurso de revocatoria", "recurso jerarquico", "procedimiento administrativo"], materias: ["Administrativo"] },
  { topic: "licitacion", keywords: ["licitacion", "contratacion administrativa", "concurso publico"], materias: ["Administrativo"] },
  { topic: "transito", keywords: ["accidente de transito", "colision", "atropello", "multa de transito", "licencia de conducir"], materias: ["Tránsito"] },
  { topic: "arbitraje", keywords: ["arbitraje", "laudo arbitral", "mediacion", "conciliacion", "resolucion alternativa"], materias: ["Procesal Civil"] },
];

function layerB(prompt: string, history: { role: string; content: string }[], alreadyFoundIds: Set<string>): LegalArticle[] {
  const combined = normalizeText([prompt, ...history.slice(-4).map(m => m.content)].join(" "));
  const promptNorm = normalizeText(prompt);
  const results: LegalArticle[] = [];
  const seen = new Set<string>(alreadyFoundIds);

  // Extract content words from prompt for relevance boosting
  const promptWords = promptNorm.split(/\s+/).filter(w => w.length > 3);

  const matchedThemes: ThemePattern[] = [];
  for (const theme of THEME_PATTERNS) {
    if (theme.keywords.some(kw => combined.includes(normalizeText(kw)))) {
      matchedThemes.push(theme);
    }
  }

  if (matchedThemes.length === 0) return [];

  const allScored: { art: LegalArticle; score: number }[] = [];

  for (const theme of matchedThemes) {
    const fuentesToSearch: string[] = [];
    for (const m of theme.materias) {
      const fuentes = materiaToFuentes[m] || materiaToFuentes[normalizeText(m)] || [];
      for (const f of fuentes) {
        if (!fuentesToSearch.includes(f)) fuentesToSearch.push(f);
      }
    }

    for (const fuente of fuentesToSearch) {
      const articles = codeCache[fuente] || [];
      for (const art of articles) {
        if (seen.has(art.id)) continue;
        const nc = normalizeText(art.contenido);
        let score = 0;
        for (const kw of theme.keywords) {
          const kwNorm = normalizeText(kw);
          if (nc.includes(kwNorm)) {
            score += kw.includes(" ") ? 3 : 1;
          }
        }
        // Boost articles that contain words from the user's actual prompt
        if (score > 0) {
          for (const pw of promptWords) {
            if (nc.includes(pw)) score += 0.5;
          }
          allScored.push({ art, score });
          seen.add(art.id);
        }
      }
    }
  }

  allScored.sort((a, b) => b.score - a.score);
  for (const { art } of allScored.slice(0, 6)) {
    results.push(art);
  }

  return results;
}

// ── LAYER C: PostgreSQL FTS ───────────────────────────────

function extractSearchTerms(prompt: string): string {
  const stopwords = new Set([
    "que", "como", "cual", "cuales", "donde", "cuando", "quien", "quienes",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "del", "al",
    "en", "de", "con", "por", "para", "sobre", "entre", "hacia", "desde",
    "es", "son", "fue", "ser", "estar", "tiene", "hay", "puede", "debe",
    "se", "su", "sus", "mi", "me", "le", "lo", "nos", "les",
    "y", "o", "pero", "si", "no", "ni", "mas", "ya", "muy", "todo", "toda",
    "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
    "dice", "establece", "indica", "menciona", "segun", "respecto",
    "costarricense", "articulo",
  ]);
  const words = normalizeText(prompt).split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));
  return words.join(" ");
}

async function layerC(prompt: string, materias: string[] | undefined, alreadyFoundIds: Set<string>, limit = 5): Promise<LegalArticle[]> {
  try {
    const searchTerms = extractSearchTerms(prompt);
    if (!searchTerms.trim()) return [];

    const detectedFuente = detectFuente(prompt, []);

    // Build OR-based tsquery for broader matching
    const words = searchTerms.split(/\s+/).filter(w => w.length > 2);
    const orQuery = words.join(" | ");

    let allRows: any[] = [];

    // Strategy 1: AND query (all terms must match)
    try {
      const r1 = await db.execute(sql`
        SELECT id, fuente, materia, articulo, contenido,
          ts_rank(to_tsvector('spanish', contenido), plainto_tsquery('spanish', ${searchTerms})) AS score
        FROM documents
        WHERE to_tsvector('spanish', contenido) @@ plainto_tsquery('spanish', ${searchTerms})
        ORDER BY score DESC
        LIMIT ${limit + 5}
      `);
      const rows1 = extractRows(r1);
      allRows.push(...rows1);
    } catch (_) {}

    // Strategy 2: OR query (any term can match) — prioritize detected fuente or materias
    if (allRows.filter(r => !alreadyFoundIds.has(r.id)).length < limit && orQuery) {
      try {
        let fuenteFilter = sql``;
        if (detectedFuente) {
          fuenteFilter = sql`AND fuente = ${detectedFuente}`;
        } else if (materias && materias.length > 0) {
          const materiasLiteral = materias.map(m => `'${m.replace(/'/g, "''")}'`).join(",");
          fuenteFilter = sql`AND materia = ANY(ARRAY[${sql.raw(materiasLiteral)}])`;
        }
        const r2 = await db.execute(sql`
          SELECT id, fuente, materia, articulo, contenido,
            ts_rank(to_tsvector('spanish', contenido), to_tsquery('spanish', ${orQuery})) AS score
          FROM documents
          WHERE to_tsvector('spanish', contenido) @@ to_tsquery('spanish', ${orQuery})
            ${fuenteFilter}
          ORDER BY score DESC
          LIMIT ${limit + 5}
        `);
        const rows2 = extractRows(r2);
        allRows.push(...rows2);
      } catch (_) {}
    }

    // Deduplicate and filter
    const seen = new Set<string>(alreadyFoundIds);
    const results: any[] = [];
    // Sort by score descending
    allRows.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    for (const r of allRows) {
      if (!seen.has(r.id)) {
        results.push(r);
        seen.add(r.id);
      }
      if (results.length >= limit) break;
    }
    return results;
  } catch (e) {
    console.error("[LayerC] FTS error:", e);
    return [];
  }
}

// ── Context assembly ─────────────────────────────────────

function dedup(articles: LegalArticle[]): LegalArticle[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

function assembleContext(a: LegalArticle[], b: LegalArticle[], c: LegalArticle[]): string {
  const all = dedup([...a, ...b, ...c]);
  if (all.length === 0) return "";

  let ctx = "═══ CONTEXTO LEGAL DE COSTA RICA (GROUND TRUTH) ═══\n\n";

  // Group by fuente for cleaner presentation
  const byFuente: Record<string, LegalArticle[]> = {};
  for (const art of all) {
    if (!byFuente[art.fuente]) byFuente[art.fuente] = [];
    byFuente[art.fuente].push(art);
  }

  for (const [fuente, arts] of Object.entries(byFuente)) {
    ctx += `**${fuente}**\n`;
    for (const art of arts) {
      if (art.articulo) ctx += `**${art.articulo}:**\n`;
      ctx += `> ${art.contenido.substring(0, 1200).replace(/\n/g, "\n> ")}\n\n`;
    }
    ctx += "---\n";
  }

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

export const LEGAL_SYSTEM_PROMPT = `Eres LexAI CR, asistente legal IA especializado en el ordenamiento jurídico de Costa Rica. Ayudas a abogados y profesionales del derecho costarricense.

REGLAS FUNDAMENTALES:
1. Responde SIEMPRE en español formal jurídico costarricense
2. Basa tus respuestas EXCLUSIVAMENTE en el contexto legal provisto (GROUND TRUTH). Cita textualmente los artículos del contexto
3. Si la pregunta NO está cubierta por el contexto provisto, di "No encontré esta norma en mi base de datos actual. Recomiendo verificar en el SINALEVI (www.pgrweb.go.cr/scij)"
4. NUNCA inventes artículos, números de ley, o citas legales que no estén en el contexto
5. Estructura: (a) norma aplicable, (b) análisis, (c) recomendaciones

FORMATO DE CIERRE:
---
**Materia**: [CONSTITUCIONAL/CIVIL/PENAL/PROCESAL_PENAL/COMERCIAL/ADMINISTRATIVO/TRANSITO/PROCESAL_CIVIL]
**Riesgo Procesal**: [BAJO/MEDIO/ALTO/N_A]
**Normativa citada**: [artículos citados]`;

// ── Main pipeline ─────────────────────────────────────────

export async function runLegalPipeline(
  prompt: string,
  historyMessages: { role: string; content: string }[],
  materias: string[] | undefined,
): Promise<{ groundedMessage: string; contextStr: string; layerStats: { a: number; b: number; c: number } }> {
  await ensureCacheLoaded();

  const layerAResults = await layerA(prompt, historyMessages);
  const foundIds = new Set(layerAResults.map(r => r.id));

  const layerBResults = layerB(prompt, historyMessages, foundIds);
  for (const r of layerBResults) foundIds.add(r.id);

  const layerCResults = await layerC(prompt, materias, foundIds, 5);

  const contextStr = assembleContext(layerAResults, layerBResults, layerCResults);
  const { isAnalysis, isReview } = detectMode(prompt);

  let modeInstructions = "";
  if (isAnalysis) {
    modeInstructions = "\n\n[MODO ANÁLISIS: Sé exhaustivo, cita artículos y estructura en secciones claras.]";
  }
  if (isReview) {
    modeInstructions += "\n\n[MODO REVISIÓN: Identifica plazos, prescripciones y riesgos procesales.]";
  }

  const groundedMessage = contextStr
    ? `📚 ${contextStr}${modeInstructions}\n\nCONSULTA DEL USUARIO: ${prompt}`
    : `${modeInstructions ? modeInstructions + "\n\n" : ""}CONSULTA DEL USUARIO: ${prompt}`;

  return {
    groundedMessage,
    contextStr,
    layerStats: { a: layerAResults.length, b: layerBResults.length, c: layerCResults.length },
  };
}
