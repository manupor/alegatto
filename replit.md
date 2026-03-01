# LexAI CR — Legal AI SaaS for Costa Rica

## Overview
Full-stack legal AI SaaS platform for Costa Rica built with React + Express + PostgreSQL (with pgvector for semantic search). Dark theme (#0f172a background, #1e293b cards, #10B981 emerald accent).

## Architecture
- **Frontend**: React + Vite, TypeScript, TailwindCSS, shadcn/ui, Wouter routing, TanStack Query
- **Backend**: Express.js (TypeScript), Drizzle ORM, PostgreSQL + pgvector
- **AI**: OpenAI (gpt-4o-mini via Replit AI Integrations)
- **Legal Search**: PostgreSQL FTS (plainto_tsquery Spanish stemming) — Replit AI proxy does not support /embeddings

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
1. **Multi-tenant Onboarding** — `/register-firm` wizard (firm name, auto-slug, plan selector); auto-redirect from `/dashboard` if no org
2. **RBAC** — `RequireRole` component gates routes by role rank (admin > senior > assistant > intern); sidebar hides Analytics/Team for non-admins; server enforces `hasRoleAtLeast()` on org endpoints
3. **Team Management** — `/dashboard/team` (admin only): list members, change roles, remove with confirm dialog, invite by email (generates invite link), pending invites list
4. **Org-scoped Data** — all list queries (cases, documents, appeals, conversations, deadlines) filter by `orgId` when user belongs to an org; new records include `orgId`
5. **AI Chat** — RAG over 4,481 chunks of 8 Costa Rican legal codes via PostgreSQL FTS (Spanish stemming); retrieval uses `plainto_tsquery` + `ts_rank` with ILIKE fallback; files ingested: Constitución Política, Código Civil, Código Penal, Código Procesal Penal, Código de Comercio, Ley General Administración Pública, Ley RAC, Ley de Tránsito 9078; ingestion script at `scripts/ingest-legal-docs.ts`
6. **Document Analysis** — PDF/DOCX upload → AI structured analysis (parties, risks, omissions)
7. **Appeal Generator** — 5-step wizard with streaming output, edit-in-editor, copy/download
8. **Document Editor** — Tiptap editor with 30s autosave, version history (max 10), DOCX export
9. **E-Signature** — Dropbox Sign integration (real API if `DROPBOX_SIGN_API_KEY` set, else mocked)
10. **Case Management** — Case list/detail with timeline events, internal notes, CSV export
11. **Alerts** — Deadline tracking with color coding (red/yellow/green by days remaining)
12. **Analytics** — Charts (line, bar, pie) via recharts for docs, cases, appeals (admin only)

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
