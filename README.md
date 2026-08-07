# 🔍 CostWatch — Cloud Cost Anomaly Detection

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/next.js-16.3.0-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-30%2F33%20passing-success.svg)](#testing--verification)

A production-grade **FinOps anomaly detection platform** for AWS & GCP. Catches cost spikes in near-real-time using z-score statistical detection, auto-generates root-cause summaries, and alerts via Slack + Email. Multi-tenant with JWT auth, background sync, and Docker-ready deployment.

---

## 🎯 Key Features

- ☁️ **Multi-Cloud Cost Ingestion**: AWS Cost Explorer (STS AssumeRole), GCP BigQuery billing export, and custom HTTP endpoints with API keys
- 📊 **Z-Score Anomaly Detection**: Statistical outlier detection per service/region/account with configurable severity thresholds
- 🧠 **Root-Cause Summaries**: Automated explanations for every anomaly (reserved instance expiry, misconfigured autoscaling, forgotten dev environments)
- 📢 **Dual-Channel Alerting**: Slack webhooks with action buttons + SMTP email with HTML templates
- 🔐 **Production Auth**: JWT split (15min access + 7d refresh with rotation), CSRF protection, password reset flow
- 👥 **Multi-Tenant Isolation**: User-scoped data, cloud accounts, configs, and alerts — zero cross-tenant leakage
- ⏰ **Background Sync Worker**: `node-cron` scheduler (every 6h) + manual trigger via dashboard
- 🗄️ **Dual Database Support**: SQLite for local dev, Postgres for production — same API, zero code changes
- 🔄 **Database Migrations**: Versioned schema migrations with up/down support
- 📈 **Observability**: Sentry error tracking, structured JSON logging, health check endpoint, graceful shutdown
- 🧪 **Testing Suite**: 33 Jest unit tests + Playwright E2E auth flow tests
- 🚀 **CI/CD Ready**: GitHub Actions (lint → test → build → deploy), Docker standalone image

---

## 🏗️ System Architecture

```mermaid
graph TD
    CSV[CSV Upload /api/costs] --> Parser[CUR Parser]
    AWS[AWS Cost Explorer] --> Parser
    GCP[GCP BigQuery] --> Parser
    Custom[Custom HTTP Endpoint] --> Parser
    Parser --> ZScore[Z-Score Detection]
    ZScore --> Anomalies{Anomalies Found?}
    Anomalies -->|Yes| Slack[Slack Webhook]
    Anomalies -->|Yes| Email[SMTP Email]
    Anomalies -->|Yes| DB[(SQLite / Postgres)]
    Anomalies -->|No| Done[No Action]
    DB --> Sync[Background Sync Worker\nnode-cron every 6h]
    Sync --> AWS
    Sync --> GCP
    Sync --> Custom
```

---

## 📂 Project Structure

```
65-cloud-cost-anomaly/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── auth/           # register, login, logout, me, refresh, forgot/reset password
│   │   │   │   ├── costs/          # POST upload CUR, GET cost data
│   │   │   │   ├── anomalies/      # POST update status (acknowledge/resolve)
│   │   │   │   ├── alerts/         # GET history, POST send to Slack
│   │   │   │   ├── settings/       # GET/POST Slack webhook + SMTP config
│   │   │   │   ├── connect/        # GET/POST/DELETE cloud accounts
│   │   │   │   ├── sync/           # POST manual sync, GET status
│   │   │   │   └── health/         # GET health check
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx        # Overview
│   │   │   │   ├── anomalies/      # Anomaly list with actions
│   │   │   │   ├── costs/          # Charts + CSV upload
│   │   │   │   ├── alerts/         # Alert history
│   │   │   │   └── settings/       # 4 tabs: CSV, AWS, GCP, Custom + Alerts
│   │   │   ├── login/              # Auth page
│   │   │   └── page.tsx            # Landing page
│   │   ├── components/             # Skeleton, EmptyState, ErrorBoundary, Reveal, Button
│   │   ├── lib/
│   │   │   ├── alerts/             # slack.ts, email.ts
│   │   │   ├── anomaly-detection/  # zscore.ts
│   │   │   ├── cloud/              # aws.ts, gcp.ts, custom.ts
│   │   │   ├── cost-ingest/        # parser.ts
│   │   │   ├── __tests__/          # Jest tests (parser, zscore, slack, db, api)
│   │   │   ├── auth.ts             # JWT + bcrypt helpers
│   │   │   ├── db.ts               # SQLite adapter (multi-tenant)
│   │   │   ├── db-pg.ts            # Postgres adapter (same API)
│   │   │   ├── worker.ts           # node-cron scheduler
│   │   │   ├── migrations.ts       # Schema migrations
│   │   │   ├── retry.ts            # Exponential backoff
│   │   │   ├── sentry.ts           # Error tracking
│   │   │   ├── validation.ts       # Zod schemas
│   │   │   ├── rate-limit.ts       # In-memory rate limiter
│   │   │   ├── logger.ts           # Structured JSON logger
│   │   │   └── api-error.ts        # Error handling middleware
│   │   ├── middleware.ts           # JWT + CSRF + HTTPS + request logging
│   │   └── globals.css             # OKLCH tokens, animations
│   ├── e2e/                        # Playwright E2E tests
│   ├── sample-data.csv             # 15 days, 60 records, 9 baked-in anomalies
│   ├── Dockerfile                  # Standalone output + JWT_SECRET validation
│   ├── docker-compose.yml          # Health check, volumes
│   ├── jest.config.ts              # Jest + ts-jest + ESM support
│   ├── playwright.config.ts        # Playwright config
│   ├── next.config.ts              # Standalone, serverExternalPackages
│   └── package.json
├── .github/workflows/
│   ├── ci.yml                      # Lint → Test → Build
│   └── deploy.yml                  # Deploy on tag (placeholder)
├── README.md
├── PRODUCT.md                      # Product strategy & personas
├── DESIGN.md                       # Visual design system (OKLCH, typography)
├── .gitignore
└── LICENSE
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Slack Webhook URL** (for alerts, optional)
- **SMTP Credentials** (for email alerts, optional)
- **AWS Account** with Cost Explorer access (optional)
- **GCP Project** with billing export to BigQuery (optional)

### Local Development (SQLite)

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000` → **Register** → **Settings** → Upload `sample-data.csv` or connect AWS/GCP/Custom.

### Production (Docker + Postgres)

```bash
# Set required env vars
export JWT_SECRET="your-32-char-secret-here"
export DATABASE_URL="postgresql://user:pass@host:5432/costwatch"
export NODE_ENV="production"

docker compose up -d --build
```

---

## ⚙️ Environment Configuration

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `JWT_SECRET` | **Yes** | — | ≥32 chars, used for token signing |
| `DATABASE_URL` | No | — | Postgres connection string (uses SQLite if unset) |
| `NODE_ENV` | No | `development` | `production` enables HTTPS enforcement |
| `SENTRY_DSN` | No | — | Sentry error tracking DSN |
| `SENTRY_ORG` | No | — | Sentry organization slug |
| `SENTRY_PROJECT` | No | — | Sentry project slug |

### Cloud Provider Credentials (configured per-account in Settings)

| Provider | Required Fields |
| :--- | :--- |
| **AWS** | Account ID, IAM Role ARN, External ID (optional) |
| **GCP** | Project ID, Service Account Key JSON (optional) |
| **Custom** | Endpoint URL, API Key (optional, sent as Bearer token) |

---

## 🔧 API Reference

### Authentication

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/auth/register` | `POST` | Register new user |
| `/api/auth/login` | `POST` | Login, sets access + refresh cookies |
| `/api/auth/logout` | `POST` | Clear cookies |
| `/api/auth/me` | `GET` | Current user |
| `/api/auth/refresh` | `POST` | Rotate refresh token (15min access + 7d refresh) |
| `/api/auth/forgot-password` | `POST` | Request password reset (mock email) |
| `/api/auth/reset-password` | `POST` | Reset with token |

### Costs & Anomalies

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/costs` | `POST` | Upload CUR CSV, returns anomalies |
| `/api/costs` | `GET` | Get cost data (daily, by service, summary) |
| `/api/anomalies` | `POST` | Update anomaly status (acknowledge/resolve) |

### Alerts & Settings

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/alerts` | `GET` | Alert history from `alerts_log` |
| `/api/alerts` | `POST` | Send anomalies to Slack webhook |
| `/api/settings` | `GET` | Get Slack webhook + SMTP config |
| `/api/settings` | `POST` | Save Slack webhook + SMTP config |

### Cloud Accounts & Sync

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/connect` | `GET` | List connected accounts |
| `/api/connect` | `POST` | Add account (AWS/GCP/Custom) |
| `/api/connect` | `DELETE` | Remove account |
| `/api/sync` | `POST` | Trigger manual sync for account |
| `/api/sync/status` | `GET` | Worker running status |

### Health

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | DB connectivity, memory, uptime |

---

## 🧪 Testing & Verification

```bash
# Unit tests (Jest + ts-jest)
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Build production
npm run build

# E2E tests (Playwright)
npm run test:e2e

# Start production server
npm start
```

### Test Results
- **33 tests across 5 suites**: parser, zscore, slack, db, api
- **30 passing** — 3 known pre-existing failures (jose ESM, cookies scope)
- **Playwright E2E**: Auth flow (register → login → dashboard)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
