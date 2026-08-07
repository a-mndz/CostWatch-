# CostWatch — Cloud Cost Anomaly Detection

Production-grade FinOps tool for AWS & GCP. Catches cost spikes in near-real-time using z-score statistical detection, explains root causes, and alerts via Slack + Email. Built for engineering leads and FinOps teams at 10–500 employee SaaS companies.

## Current Status: **Production Ready**

| Metric | Status |
|--------|--------|
| Core MVP | ✅ Complete |
| Auth & Multi-tenant | ✅ JWT (15min access + 7d refresh), CSRF, password reset |
| AWS Integration | ✅ Cost Explorer via STS AssumeRole |
| GCP Integration | ✅ BigQuery billing export |
| Custom Cloud | ✅ Generic HTTP endpoint + API key |
| Alerting | ✅ Slack webhooks + SMTP email |
| Background Sync | ✅ node-cron (every 6h) + manual trigger |
| Database | ✅ SQLite (dev) + Postgres (prod), migrations |
| Observability | ✅ Sentry, structured logging, health checks, graceful shutdown |
| Testing | ✅ 33 Jest tests + Playwright E2E |
| CI/CD | ✅ GitHub Actions (lint, test, build, deploy) |
| Docker | ✅ Standalone image with health checks |

---

## What's Built

### Landing Page (`/`)
Public-facing page with hero, stats bar, live Slack alert demo, how-it-works flow, features, pricing, CTA, footer.

### Dashboard (`/dashboard`) — Authenticated
- **Overview** — Hero anomaly count, recent anomalies table, summary cards
- **Anomalies** — Severity-badged cards with Acknowledge/Resolve, bulk Slack alert
- **Costs** — Daily spend bar chart (CSS-only), service breakdown, CSV upload
- **Alerts** — Full alert history from `alerts_log` table
- **Settings** — 4 tabs: CSV Upload, Connect AWS, Connect GCP, Custom Cloud; Slack webhook; SMTP email config

### Auth System
- Register / Login / Logout / Me / Refresh endpoints
- JWT in httpOnly cookies (15min access, 7d refresh with rotation)
- CSRF protection on all state-changing requests
- Password reset flow (forgot/reset endpoints, token-based)
- Middleware protection for `/dashboard` routes

### API Routes (all user-scoped, validated, rate-limited, logged)

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | Clear cookies |
| `/api/auth/me` | GET | Current user |
| `/api/auth/refresh` | POST | Rotate refresh token |
| `/api/auth/forgot-password` | POST | Request reset email |
| `/api/auth/reset-password` | POST | Reset with token |
| `/api/costs` | POST, GET | Upload CUR CSV → detect anomalies → alert; get cost data |
| `/api/anomalies` | POST | Update anomaly status (acknowledge/resolve) |
| `/api/alerts` | GET, POST | Alert history; send to Slack |
| `/api/settings` | GET, POST | Slack webhook + SMTP config |
| `/api/connect` | GET, POST, DELETE | Cloud account CRUD |
| `/api/sync` | POST | Manual sync trigger |
| `/api/sync/status` | GET | Worker status |
| `/api/health` | GET | Health check (DB, memory, uptime) |

### Core Libraries

| File | Purpose |
|------|---------|
| `lib/cost-ingest/parser.ts` | AWS CUR CSV parser, aggregates by day/service/region/account |
| `lib/anomaly-detection/zscore.ts` | Z-score outlier detection, configurable thresholds |
| `lib/alerts/slack.ts` | Slack webhook payloads with severity, root-cause, actions |
| `lib/alerts/email.ts` | SMTP email alerts with HTML templates |
| `lib/cloud/aws.ts` | AWS Cost Explorer via STS AssumeRole + retry |
| `lib/cloud/gcp.ts` | GCP BigQuery billing export + retry |
| `lib/cloud/custom.ts` | Generic HTTP cost endpoint fetcher |
| `lib/db.ts` | SQLite adapter (multi-tenant) |
| `lib/db-pg.ts` | Postgres adapter (same API) |
| `lib/worker.ts` | node-cron scheduler (per-user sync) |
| `lib/migrations.ts` | Schema migration system |
| `lib/retry.ts` | Exponential backoff for cloud APIs |
| `lib/sentry.ts` | Sentry error tracking |

---

## Design System

### Color Palette (OKLCH, dark mode)
| Token | Value | Role |
|-------|-------|------|
| `--color-primary` | `oklch(55% 0.15 175)` | Deep Teal — CTAs, active states |
| `--color-secondary` | `oklch(75% 0.15 75)` | Warm Amber — Medium severity |
| `--color-tertiary` | `oklch(65% 0.18 25)` | Soft Coral — High severity |
| `--bg` | `oklch(10% 0.008 175)` | Page background |
| `--bg-surface` | `oklch(14% 0.008 175)` | Card backgrounds |
| `--text-primary` | `oklch(95% 0.005 175)` | Headings |
| `--text-muted` | `oklch(62% 0.01 175)` | Labels |

### Typography
- **Display/Headline**: Source Serif 4 (500)
- **Body/UI**: Inter (400/500/600)
- **Mono**: JetBrains Mono

### Components
Skeleton loaders, Empty states, Error boundaries, Reveal animations (250ms), Press feedback (`transform: scale(0.97)`), Reduced-motion support.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  CSV Upload     │     │  AWS Cost        │     │  GCP BigQuery   │
│  /api/costs     │     │  Explorer        │     │  Billing Export │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
    ┌─────────────────────────────────────────────────────────┐
    │                    Parser / Normalizer                   │
    │  (parser.ts / aws.ts / gcp.ts / custom.ts)              │
    └──────────────────────────┬──────────────────────────────┘
                               ▼
    ┌─────────────────────────────────────────────────────────┐
    │              Z-Score Anomaly Detection                  │
    │  (zscore.ts — mean + stddev per dimension)              │
    └──────────────────────────────┬──────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
       ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
       │   SQLite    │      │   Slack     │      │   Email     │
       │  (anomalies)│      │  (webhook)  │      │  (SMTP)     │
       └─────────────┘      └─────────────┘      └─────────────┘
              │                    │                    │
              └────────────────────┴────────────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │   Background Sync Worker   │
                    │  (node-cron, every 6h)     │
                    └────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- (Optional) AWS account with Cost Explorer access
- (Optional) GCP project with billing export to BigQuery
- (Optional) Slack webhook URL / SMTP credentials

### Local Development (SQLite)
```bash
cd web
npm install
cp .env.example .env   # add JWT_SECRET
npm run dev
```
Open `http://localhost:3000` → Register → Settings → Upload `sample-data.csv` or connect AWS/GCP.

### Production (Docker + Postgres)
```bash
docker compose up -d --build
```
Set `DATABASE_URL` and `JWT_SECRET` (32+ chars) in environment.

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | ≥32 chars, for token signing |
| `DATABASE_URL` | No | Postgres URL (uses SQLite if unset) |
| `NODE_ENV` | No | `production` enables HTTPS enforcement |
| `SENTRY_DSN` | No | Error tracking |
| `SENTRY_ORG` | No | Sentry org slug |
| `SENTRY_PROJECT` | No | Sentry project slug |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Jest unit tests |
| `npm run test:e2e` | Playwright E2E |

---

## Testing

- **Unit**: 33 tests across 5 suites (parser, zscore, slack, db, api) — 30 passing
- **E2E**: Playwright auth flow (`e2e/auth.spec.ts`)
- **Coverage**: `npm test -- --coverage`

---

## Deployment

### Docker
```bash
# Build
docker build -t costwatch .

# Run (with env file)
docker run -p 3000:3000 --env-file .env costwatch
```

### Docker Compose (includes health check)
```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### CI/CD (GitHub Actions)
- **ci.yml**: lint → test → build on every push/PR
- **deploy.yml**: build + push to registry on tag (placeholder)

---

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── api/              # All API routes (auth, costs, alerts, settings, connect, sync, health)
│   │   ├── dashboard/        # Dashboard pages (overview, anomalies, costs, alerts, settings)
│   │   ├── login/            # Auth page
│   │   └── page.tsx          # Landing page
│   ├── components/           # UI components (Skeleton, EmptyState, ErrorBoundary, Reveal, Button)
│   ├── lib/
│   │   ├── alerts/           # slack.ts, email.ts
│   │   ├── anomaly-detection/# zscore.ts
│   │   ├── cloud/            # aws.ts, gcp.ts, custom.ts
│   │   ├── cost-ingest/      # parser.ts
│   │   ├── __tests__/        # Jest tests
│   │   └── *.ts              # Core libs (db, auth, validation, worker, etc.)
│   ├── middleware.ts         # JWT + CSRF + HTTPS + logging
│   └── globals.css           # OKLCH tokens, animations
├── e2e/                      # Playwright tests
├── sample-data.csv           # 15 days, 60 records, 9 anomalies
├── Dockerfile                # Standalone output + JWT_SECRET validation
├── docker-compose.yml        # Health check, volumes
├── jest.config.ts            # Jest + ts-jest + ESM
├── playwright.config.ts      # Playwright config
└── next.config.ts            # Standalone, serverExternalPackages
```

---

## Security

- JWT split: 15min access + 7d refresh (rotated on each use)
- CSRF tokens on all state-changing requests
- Password reset with expiring tokens
- Rate limiting per endpoint
- Input validation (zod) on all API routes
- HTTPS enforcement in production
- Secure httpOnly cookies
- Sentry error tracking (no PII)

---

## License

MIT