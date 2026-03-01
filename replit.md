# LexAI CR — Legal AI SaaS for Costa Rica

## Overview
Full-stack legal AI SaaS platform for Costa Rica built with React + Express + PostgreSQL (with pgvector for semantic search). Dark theme (#0f172a background, #1e293b cards, #10B981 emerald accent).

## Architecture
- **Frontend**: React + Vite, TypeScript, TailwindCSS, shadcn/ui, Wouter routing, TanStack Query
- **Backend**: Express.js (TypeScript), Drizzle ORM, PostgreSQL + pgvector
- **AI**: OpenAI (gpt-4o-mini + text-embedding-3-small via Replit AI Integrations)

## Key Routes

### Frontend Pages
| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard` | MainDashboardPage | Metrics dashboard (cases, docs, alerts) |
| `/dashboard/chat` | ChatPage | AI legal chat with area filters |
| `/dashboard/analysis` | AnalysisPage | PDF/DOCX analysis with AI |
| `/dashboard/appeals/new` | AppealNewPage | 5-step appeal generator |
| `/dashboard/documentos` | DocumentsPage | Document list |
| `/dashboard/editor/:id` | EditorPage | Tiptap editor + version history + firma |
| `/dashboard/cases` | CasesPage | Case management table |
| `/dashboard/cases/:id` | CaseDetailPage | Case detail + events + notes |
| `/dashboard/alerts` | AlertsPage | Procedural deadlines |
| `/dashboard/analytics` | AnalyticsPage | Charts via recharts |

### Backend API
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/chat` | AI chat with RAG |
| POST | `/api/search-normativa` | Vector search in legal corpus |
| POST | `/api/analyze-document` | Upload + AI document analysis |
| POST | `/api/generate-appeal` | Streaming appeal generation |
| GET/POST | `/api/appeals` | Appeal CRUD |
| GET/POST | `/api/editor/documents` | Document CRUD |
| PUT | `/api/editor/documents/:id` | Update + auto-version (max 10) |
| GET | `/api/editor/documents/:id/versions` | Version history |
| POST | `/api/editor/documents/:id/versions/:vid/restore` | Restore version |
| POST | `/api/firma/enviar` | Send for e-signature (Dropbox Sign) |
| GET/POST | `/api/cases` | Case CRUD |
| GET | `/api/cases/:id` | Case detail + events + notes |
| POST | `/api/cases/:id/events` | Add timeline event |
| POST | `/api/cases/:id/notes` | Add internal note |
| GET/POST | `/api/deadlines` | Deadline CRUD |
| PUT | `/api/deadlines/:id` | Update deadline status |

## Database Schema
Key tables: `users`, `conversations`, `messages`, `document_editors`, `document_versions`, `firma_requests`, `documents` (legal corpus with pgvector), `appeals`, `cases`, `case_events`, `case_notes`, `deadlines`, `organizations`, `org_members`

## Authentication
Currently using demo user (`DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"`) with stub auth endpoints. Replit Auth integration files exist in `server/replit_integrations/auth/` but not yet wired for production auth.

## Key Features Built
1. **AI Chat** — RAG over 10,097 chunks of Costa Rican legal normative with legal area filters
2. **Document Analysis** — PDF/DOCX upload → AI structured analysis (parties, risks, omissions)
3. **Appeal Generator** — 5-step wizard with streaming output, edit-in-editor, copy/download
4. **Document Editor** — Tiptap editor with 30s autosave, version history (max 10), DOCX export
5. **E-Signature** — Dropbox Sign integration (real API if `DROPBOX_SIGN_API_KEY` set, else mocked)
6. **Case Management** — Case list/detail with timeline events, internal notes, CSV export
7. **Alerts** — Deadline tracking with color coding (red/yellow/green by days remaining)
8. **Analytics** — Charts (line, bar, pie) via recharts for docs, cases, appeals

## Environment Variables
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key (set via Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI base URL
- `DATABASE_URL` — PostgreSQL connection string
- `DROPBOX_SIGN_API_KEY` — Optional; enables real Dropbox Sign API
- `SESSION_SECRET` — Session secret

## Development Notes
- PDF parsing: uses `pdf-parse` via CommonJS `require()` (ESM workaround)
- Vector search may fail silently if pgvector extension not loaded; chat still works
- `font-display` is a CSS custom property (not a Tailwind class); use plain classes for headings
- NEVER modify `vite.config.ts`, `drizzle.config.ts`, or `package.json`
