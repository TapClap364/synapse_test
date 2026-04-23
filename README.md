# Synapse AI

AI-native project management for teams: tasks, docs, whiteboards, meetings — all unified under one workspace, with an AI assistant that understands your project context.

**Live:** https://synapse-project-chi.vercel.app
**Stack:** React 18 · TypeScript (strict) · Vite · Supabase · Vercel Serverless · OpenRouter / OpenAI · Stripe

---

## Architecture

- **Multi-tenant SaaS** — data isolated per `workspace` via Supabase Row-Level Security.
- **Roles per workspace:** `owner` · `admin` · `member` · `viewer`.
- **API**: Vercel serverless functions in `/api`. Every endpoint is wrapped by `createHandler()` which enforces:
  - CORS allowlist
  - Supabase JWT auth (`Authorization: Bearer ...`)
  - Workspace membership (`X-Workspace-Id` header)
  - Zod schema validation
  - Rate limiting (Upstash, optional)
  - Sentry error capture (optional)
- **Frontend**: React with React Router; routes are lazy-loaded for ~40% smaller initial bundle.
- **i18n**: i18next with RU + EN bundles.

```
src/
  lib/             # supabase, apiClient, workspace context, sentry, analytics, i18n
  hooks/           # useAuth, useData, useCpm, useMeetingRecorder
  components/      # UI components (KanbanView, TaskModal, WorkspaceSwitcher, …)
  types/           # database.ts (auto-generated) + index.ts (domain)
  locales/         # ru.json, en.json
api/
  _lib/            # auth, cors, ratelimit, sentry, handler, supabase, openai, stripe, errors
  *.ts             # serverless endpoints (one file per route)
```

---

## Local development

```bash
cp .env.example .env.local
# fill in the values
npm install
npm run dev          # vite dev server on :5173
# in another shell, if you want to test /api locally:
npx vercel dev       # vercel dev server on :3000 (proxied by Vite)
```

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (typecheck + bundle) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, fails on warnings |
| `npm test` | Vitest run-once |
| `npm run test:watch` | Vitest watch mode |
| `npm run preview` | Preview built bundle |

---

## Database

The Postgres schema lives in Supabase. Schema migrations applied so far (managed via Supabase MCP):

1. `001_workspaces_schema` — `workspaces` + `workspace_members` + helper RPCs
2. `002_default_workspace_seed` — initial Default Workspace for existing data/users
3. `003_add_workspace_id_columns` — backfilled `workspace_id` on all data tables
4. `004_replace_rls_policies` — workspace-aware RLS replaces the old open policies
5. `005_indexes_signup_and_function_hardening` — FK indexes, function `search_path`, auto-create personal workspace on signup
6. `006_lock_storage_bucket` — workspace-scoped storage policies for `document-attachments`

To regenerate types after a schema change:

```bash
npx supabase gen types typescript --project-id lwzgjbargriairtlermd > src/types/database.ts
```

---

## Deployment

`main` branch auto-deploys to Vercel (project `synapse_project`). PRs get preview deploys.

### Required Vercel env vars

See `.env.example`. The minimum to ship:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend)
- `OPENROUTER_API_KEY` *or* `OPENAI_API_KEY` (AI endpoints)
- `ALLOWED_ORIGINS`, `PUBLIC_APP_URL` (CORS)

Strongly recommended for production:
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limiting)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (billing)
- `SENTRY_DSN`, `VITE_SENTRY_DSN`
- `VITE_POSTHOG_KEY`

---

## Stripe webhook setup

1. In Stripe Dashboard → Developers → Webhooks, create an endpoint:
   `https://your-domain/api/stripe-webhook`
2. Subscribe to events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Security checklist before launch

- [ ] Enable **Leaked Password Protection** in Supabase → Auth → Policies
- [ ] Set `ALLOWED_ORIGINS` to your real production domain only
- [ ] Configure Upstash for rate limiting (without it, AI endpoints are unprotected)
- [ ] Configure Sentry DSN (errors otherwise go to stdout only)
- [ ] Replace placeholder Terms / Privacy / Cookies (`src/components/LegalPage.tsx`) with text reviewed by a lawyer
- [ ] Verify Stripe webhook signature is enforced (it is — but test in Stripe test mode first)
- [ ] Review the personal-workspace auto-create logic in the `handle_new_user` trigger if you want different default behavior
- [ ] Run `npm test && npm run typecheck && npm run lint` before merging to `main`

---

## Contributing

1. Branch from `main`: `git checkout -b feat/your-thing`
2. Commit with conventional messages (CI runs lint + typecheck + test + build on each PR)
3. Open PR → Vercel posts a preview URL → review → squash-merge

---

## License

Private. All rights reserved.
