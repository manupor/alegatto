/**
 * LexAI CR — Legal Document Ingestion Script
 * Parses Costa Rican legal documents, chunks by article/section,
 * and inserts into the `documents` table.
 *
 * Retrieval uses PostgreSQL full-text search (Spanish stemming via tsvector).
 * Note: Replit AI proxy does not support the /embeddings endpoint,
 * so we use FTS-based retrieval instead.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "../attached_assets");
const WORKER_PATH = path.join(__dirname, "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");

// Costa Rican legal documents to ingest.
// Note: codigo_procesal_penal_actualizado23-03-06 is Buenos Aires Ley 11922 — excluded.
const DOCS: { keyword: string; fuente: string; materia: string }[] = [
  {
    keyword: "constitucion_politica_digital",
    fuente: "Constitución Política de Costa Rica (1949)",
    materia: "Constitucional",
  },
  {
    keyword: "Ley_General_de_la_Administracion_Publica",
    fuente: "Ley General de la Administración Pública N° 6227",
    materia: "Administrativo",
  },
  {
    keyword: "Ley_resolucion_alternativa_conflictos",
    fuente: "Ley RAC — Resolución Alterna de Conflictos N° 7727",
    materia: "Procesal Civil",
  },
  {
    keyword: "NSITO",
    fuente: "Ley de Tránsito por Vías Públicas N° 9078",
    materia: "Tránsito",
  },
  {
    keyword: "digo_civil",
    fuente: "Código Civil de Costa Rica (Ley 63/1887)",
    materia: "Civil",
  },
  {
    keyword: "codigo-penal",
    fuente: "Código Penal de Costa Rica N° 4573",
    materia: "Penal",
  },
  {
    keyword: "codigo-procesal-penal",
    fuente: "Código Procesal Penal de Costa Rica N° 7594",
    materia: "Procesal Penal",
  },
  {
    keyword: "codigo-comercio",
    fuente: "Código de Comercio de Costa Rica N° 3284",
    materia: "Comercial",
  },
];

// ── File lookup ───────────────────────────────────────────

function findFile(keyword: string): string | null {
  const entries = fs.readdirSync(ASSETS_DIR);
  const matches = entries.filter(e =>
    e.includes(keyword) && (e.endsWith(".pdf") || e.endsWith(".txt"))
  );
  if (matches.length === 0) return null;
  // Prefer .txt over .pdf (cleaner text, no OCR artifacts)
  const txt = matches.find(e => e.endsWith(".txt"));
  const chosen = txt || matches[0];
  return path.join(ASSETS_DIR, chosen);
}

// ── PDF text extraction ───────────────────────────────────

let _pdfjsLib: any = null;
async function getPdfjs() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
    _pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${WORKER_PATH}`;
  }
  return _pdfjsLib;
}

async function extractPdfText(filePath: string): Promise<string> {
  const pdfjsLib = await getPdfjs();
  const buf = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(buf);
  const doc = await pdfjsLib.getDocument({ data: uint8, disableFontFace: true }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ")
      .replace(/\s{2,}/g, " ");
    pages.push(pageText);
  }
  return pages.join("\n");
}

async function extractText(filePath: string): Promise<string> {
  if (filePath.endsWith(".txt")) {
    return fs.readFileSync(filePath, "utf-8");
  }
  return extractPdfText(filePath);
}

// ── Chunking ─────────────────────────────────────────────

const ARTICLE_HEADER = /(?:ARTÍCULO|Artículo|ARTICULO|Articulo)\s+(\d+[\w]*)/;

function chunkByArticle(text: string): { articulo: string; contenido: string }[] {
  const chunks: { articulo: string; contenido: string }[] = [];

  const parts = text.split(/(?=(?:ARTÍCULO|Artículo|ARTICULO|Articulo)\s+\d+)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length < 20) continue;

    const match = ARTICLE_HEADER.exec(trimmed);
    const artNum = match ? `Artículo ${match[1]}` : "";

    if (trimmed.length > 1800) {
      const sents = trimmed.split(/(?<=[.;])\s+/);
      let chunk = "";
      let subIdx = 0;
      for (const s of sents) {
        if (chunk.length + s.length > 1500 && chunk.length > 80) {
          chunks.push({ articulo: artNum ? `${artNum} (${++subIdx})` : "Bloque", contenido: chunk.trim() });
          chunk = s + " ";
        } else {
          chunk += s + " ";
        }
      }
      if (chunk.trim().length > 20) {
        chunks.push({ articulo: artNum ? `${artNum} (${++subIdx})` : "Bloque", contenido: chunk.trim() });
      }
    } else {
      chunks.push({ articulo: artNum, contenido: trimmed });
    }
  }

  // Fallback: paragraph chunking when no article markers found
  if (chunks.length < 5) {
    console.log("   ↳ Using paragraph chunking (few article markers)");
    const paras = text.split(/\n{2,}/).filter(p => p.trim().length > 80);
    let i = 0;
    let current = "";
    for (const para of paras) {
      current += para.trim() + "\n\n";
      if (current.length > 1500) {
        chunks.push({ articulo: `Bloque ${++i}`, contenido: current.trim() });
        current = "";
      }
    }
    if (current.trim().length > 80) {
      chunks.push({ articulo: `Bloque ${++i}`, contenido: current.trim() });
    }
  }

  return chunks;
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log("🔄 Setting up database...");

  // Ensure FTS index exists
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS documents_fts_idx
    ON documents USING GIN(to_tsvector('spanish', contenido))
  `);
  console.log("   ✓ FTS index ready");

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const doc of DOCS) {
    const filePath = findFile(doc.keyword);

    if (!filePath) {
      console.warn(`\n⚠️  No file found for keyword "${doc.keyword}", skipping`);
      totalSkipped++;
      continue;
    }

    const ext = filePath.endsWith(".txt") ? "TXT" : "PDF";
    console.log(`\n📄 ${doc.fuente}`);
    console.log(`   [${ext}] ${path.basename(filePath)}`);

    let rawText: string;
    try {
      rawText = await extractText(filePath);
      console.log(`   Chars: ${rawText.length.toLocaleString()}`);
    } catch (err: any) {
      console.error(`   ❌ Extraction error: ${err.message}`);
      totalSkipped++;
      continue;
    }

    const chunks = chunkByArticle(rawText);
    console.log(`   Chunks: ${chunks.length}`);

    if (chunks.length === 0) {
      console.warn("   ⚠️  No chunks generated, skipping");
      totalSkipped++;
      continue;
    }

    // Insert chunks in batches of 50
    const INSERT_BATCH = 50;
    let docInserted = 0;

    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const batch = chunks.slice(i, i + INSERT_BATCH);

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const slug = doc.materia.replace(/[^a-zA-Z0-9]/g, "_");
        const docId = `${slug}_${i + j}`;

        try {
          await db.execute(sql`
            INSERT INTO documents (id, fuente, materia, articulo, contenido)
            VALUES (
              ${docId},
              ${doc.fuente},
              ${doc.materia},
              ${chunk.articulo || null},
              ${chunk.contenido.substring(0, 4000)}
            )
            ON CONFLICT (id) DO UPDATE SET
              contenido = EXCLUDED.contenido,
              fuente = EXCLUDED.fuente,
              materia = EXCLUDED.materia,
              articulo = EXCLUDED.articulo
          `);
          docInserted++;
          totalInserted++;
        } catch (err: any) {
          console.error(`\n   ❌ DB error (${docId}): ${err.message.substring(0, 120)}`);
        }
      }

      const pct = Math.round(((i + batch.length) / chunks.length) * 100);
      process.stdout.write(`   Progress: ${pct}% (${Math.min(i + INSERT_BATCH, chunks.length)}/${chunks.length})\r`);
    }
    console.log(`\n   ✅ ${docInserted} chunks inserted`);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🎉 Done! Total: ${totalInserted} chunks | Skipped: ${totalSkipped} docs`);

  const result = await db.execute(sql`
    SELECT materia, fuente, COUNT(*) as chunks
    FROM documents
    GROUP BY materia, fuente
    ORDER BY materia
  `);

  console.log("\n📊 Database summary:");
  for (const row of result as any[]) {
    console.log(`   [${(row.materia as string).padEnd(16)}] ${String(row.chunks).padStart(4)} chunks — ${row.fuente}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("\n💥 Fatal:", err.message);
  process.exit(1);
});
