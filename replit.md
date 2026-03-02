# Alegatto — Legal AI SaaS for Costa Rica

## Overview
Full-stack legal AI SaaS platform for Costa Rica built with React + Express + PostgreSQL (with pgvector for semantic search). Dark theme (#0f172a background, #1e293b cards, #10B981 emerald accent). Formerly named "LexAI CR".

## Architecture
- **Frontend**: React + Vite, TypeScript, TailwindCSS, shadcn/ui, Wouter routing, TanStack Query
- **Backend**: Express.js (TypeScript), Drizzle ORM, PostgreSQL + pgvector
- **AI**: OpenAI (gpt-4o via Replit AI Integrations, temperature 0.1, 2500 max_tokens)
- **Legal Search**: 3-layer retrieval pipeline (Layer A: article number O(1) lookup, Layer B: keyword/theme scored search, Layer C: PostgreSQL FTS with OR/AND strategies) — no embeddings (Replit AI proxy doesn't support /embeddings)

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
| GET | `/api/calendar/status` | Returns `{ connected: bool }` — whether user has Google Calendar tokens |
| POST | `/api/calendar/create-event` | Creates event in user's Google Calendar via API (requires OAuth tokens); body: `{ summary, description, date }` |

## Database Schema
Key tables: `users`, `conversations`, `messages`, `document_editors`, `document_versions`, `firma_requests`, `documents` (legal corpus with pgvector), `appeals`, `cases`, `case_events`, `case_notes`, `deadlines`, `organizations`, `org_members`

## Authentication
Currently using demo user (`DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"`) with stub auth endpoints. Replit Auth integration files exist in `server/replit_integrations/auth/` but not yet wired for production auth.

## Key Features Built
1. **Multi-tenant Onboarding** — `/register-firm` wizard (firm name, auto-slug, plan selector); auto-redirect from `/dashboard` if no org
2. **RBAC** — `RequireRole` component gates routes by role rank (admin > senior > assistant > intern); sidebar hides Analytics/Team for non-admins; server enforces `hasRoleAtLeast()` on org endpoints
3. **Team Management** — `/dashboard/team` (admin only): list members, change roles, remove with confirm dialog, invite by email (auto-sends via Resend), pending invites list. Invite acceptance page at `/invite/:token`. Email module at `server/email.ts` uses `resend` package. `RESEND_API_KEY` is configured. FROM address is `onboarding@resend.dev` (Resend test domain). For production, add a verified domain in resend.com and update the FROM constant in `server/email.ts`.
4. **Org-scoped Data** — all list queries (cases, documents, appeals, conversations, deadlines) filter by `orgId` when user belongs to an org; new records include `orgId`
5. **AI Chat** — 3-layer RAG pipeline over 4,482 chunks of 8 Costa Rican legal codes; Layer A: regex article-number detection → O(1) in-memory Map lookup (all sub-chunks); Layer B: 27 keyword/theme patterns scored against in-memory article cache with prompt-word boosting; Layer C: PostgreSQL FTS (Spanish stemming) with AND+OR dual strategy and fuente-prioritized search. Pipeline file: `server/legal-pipeline.ts`; ingestion: `scripts/ingest-legal-docs.ts`
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

## Mobile App (Expo)
The `mobile/` directory contains a React Native companion app built with Expo SDK 51. It's designed to run locally on the developer's machine (not in Replit).

### Mobile Tech Stack
- Expo SDK 51 (managed workflow) + Expo Router (file-based routing)
- NativeWind (Tailwind for React Native) + TypeScript
- React Query + Zustand (state management)
- Expo SecureStore (JWT token storage)

### Mobile Screens
| Path | Screen | Description |
|------|--------|-------------|
| `app/login.tsx` | Login | Email/password auth |
| `app/register-firm.tsx` | Register Firm | Firm onboarding wizard |
| `app/(tabs)/dashboard/` | Dashboard | Metrics, recent cases, quick actions |
| `app/(tabs)/chat/` | Chat | RAG legal chat with area filters |
| `app/(tabs)/cases/` | Cases | Case list + detail + create |
| `app/(tabs)/documents/` | Documents | Document list + detail |
| `app/(tabs)/settings/` | Settings | Profile, org, logout |

### Running Locally
```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:5000 npx expo start
```

## Authentication
Real session-based auth using passport.js + bcryptjs. **No Replit OIDC dependency.**

- **Strategy**: `passport-local` with bcrypt password hashing (10 rounds)
- **Sessions**: `express-session` backed by PostgreSQL (`connect-pg-simple`, `sessions` table, auto-created)
- **Auth module**: `server/auth.ts` — exports `setupAuth(app)`, `passport`, `bcrypt`
- **Dev fallback**: In `NODE_ENV=development`, unauthenticated requests fall back to `DEMO_USER_ID` so you don't need to log in during development
- **Production**: `getUserId()` returns `""` when not authenticated → 401 returned
- **Demo credentials**: `demo@lexai.cr` / `demo123`
- **Registration**: `POST /api/auth/register` creates real bcrypt-hashed users

## Deployment

### Production Build
```bash
npm run build          # builds dist/public/ (frontend) + dist/index.cjs (server)
npm run start          # runs node dist/index.cjs
```

### Vercel Deployment
- `vercel.json` is configured for Express+Vite (NOT Next.js)
- `api/index.ts` is the Vercel serverless entry point (handles all /api/* routes)
- `outputDirectory: "dist/public"` serves static frontend from Vercel CDN
- Set env vars in Vercel dashboard: `DATABASE_URL`, `SESSION_SECRET`, `OPENAI_API_KEY`

### Alternative Platforms (Recommended for Production)
Railway, Render, Fly.io — better suited for long-running Express servers with WebSocket support and larger memory. Simply set the start command to `npm run start`.

## Development Notes
- PDF parsing: uses `pdf-parse` via CommonJS `require()` (ESM workaround)
- Vector search may fail silently if pgvector extension not loaded; chat still works
- `font-display` is a CSS custom property (not a Tailwind class); use plain classes for headings
- NEVER modify `vite.config.ts`, `drizzle.config.ts`, or `package.json`
- TypeScript errors in `server/replit_integrations/` are pre-existing and don't affect the build (esbuild strips types)
