# CostWatch — Cloud Cost Anomaly Detection for AWS & GCP

[![Next.js](https://img.shields.io/badge/next.js-16.3.0-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-4.0-38bdf8.svg)](https://tailwindcss.com/)

An intelligent cloud cost anomaly detection system for FinOps teams at small-to-mid SaaS companies (10–500 employees) running on AWS or GCP. Catches cost spikes before they become incidents using z-score statistical filtering, LLM-powered root-cause summaries, and Slack alerts with one-click actions.

---

## What Is This

CostWatch is a financial operations tool that monitors your cloud spending and alerts you when something looks wrong. Instead of requiring you to stare at dashboards all day, it proactively sends Slack messages when costs deviate from expected patterns — and tells you *why*.

**The problem it solves:** Cloud bills arrive late and surprise you. By the time you see a $15,000 EC2 spike, it's already happened. CostWatch catches these anomalies in near-real-time and explains what caused them (reserved instance expiry, misconfigured auto-scaling groups, forgotten dev environments).

**Who it's for:** Engineering leads and FinOps engineers at companies spending $5K–$500K/month on AWS or GCP who have been burned by surprise bills but don't want to pay $500+/mo for enterprise tools like Vantage or CloudHealth.

---

## What's Built

### Landing Page (`/`)

The public-facing page that explains the product and converts visitors.

- **Hero section** — "Cloud cost anomalies caught in minutes, not months" with dual CTAs (See Demo → `/dashboard`, How it Works → features)
- **Stats bar** — Customer-impact metrics (not vanity metrics): "Catches anomalies in 5 minutes, not 3 months"
- **Demo section** — A mock Slack alert showing exactly what the product delivers: service, severity, expected vs actual spend, LLM root-cause explanation, and action buttons (View Runbook, Acknowledge, Open Jira)
- **How it Works** — 3-step flow: Connect AWS → Z-score detection → Slack alerts
- **Features** — 6 cards covering: CUR parsing, z-score detection, LLM root-cause, Slack integration, multi-dimensional analysis, historical baselines
- **Pricing** — 3 tiers (Starter $49/mo, Growth $149/mo, Scale custom) tied to AWS spend, not headcount
- **CTA** — "Your next AWS bill doesn't have to be a surprise"
- **Footer** — Trust signals (SOC 2 ready, 14-day trial, no credit card)

### Dashboard (`/dashboard`)

The authenticated product experience. Sidebar navigation across 4 pages.

#### Overview (`/dashboard`)
- **Hero anomaly count** — Large number showing open anomalies (the one thing that needs attention)
- **Recent anomalies table** — 7-column table: Service, Date, Expected, Actual, Change, Severity, Status
- **Summary cards** — Monthly spend, active anomalies, alerts sent, cost saved (clickable, linking to detail pages)
- **Skeleton loading** — 800ms simulated load with pulsing placeholders
- **Empty state** — "No anomalies detected. AWS CUR connection is healthy."

#### Anomalies (`/dashboard/anomalies`)
- **Anomaly cards** — Each showing: severity badge, service name, region, date, expected/actual/change in monospace, root-cause explanation from LLM
- **Action buttons** — Acknowledge, Open Jira Ticket (on open anomalies only)
- **Skeleton loading** — 600ms simulated load
- **Empty state** — "No anomalies detected. We'll keep monitoring."

#### Costs (`/dashboard/costs`)
- **Daily spend bar chart** — CSS-only bar chart (no chart library), 15 days, coral bars for anomaly days
- **Service breakdown** — Progress bars showing spend by service (EC2, RDS, S3, Lambda, CloudFront, Other)
- **Skeleton loading** — 700ms simulated load
- **Empty state** — "No cost data yet. Connect your AWS CUR to start tracking."

#### Alerts (`/dashboard/alerts`)
- **Alert history table** — Service, Severity, Change, Summary, Channel, Sent time, Delivery status
- **Skeleton loading** — 600ms simulated load
- **Empty state** — "No alerts sent yet. Alerts appear once anomalies are detected."

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/costs` | POST | Upload CUR CSV data, returns anomalies found |
| `/api/alerts` | POST | Send anomalies to Slack webhook |

### Core Libraries

| File | Purpose |
|------|---------|
| `lib/cost-ingest/parser.ts` | Parses AWS CUR CSV format, aggregates by day/service/region/account |
| `lib/anomaly-detection/zscore.ts` | Z-score statistical outlier detection with configurable thresholds |
| `lib/alerts/slack.ts` | Builds Slack webhook payloads with severity, root-cause, and action buttons |

---

## Design System

### Color Palette (OKLCH)

Dark mode only. Cool-tinted neutrals (hue 175) for a technical feel. Three accent colors map to anomaly severity.

| Token | Value | Role |
|-------|-------|------|
| `--color-primary` | `oklch(55% 0.15 175)` | Deep Teal — CTAs, active states, brand anchor |
| `--color-secondary` | `oklch(75% 0.15 75)` | Warm Amber — Warning states, medium anomalies |
| `--color-tertiary` | `oklch(65% 0.18 25)` | Soft Coral — High-severity alerts, critical |
| `--bg` | `oklch(10% 0.008 175)` | Page background (near-black, blue tint) |
| `--bg-surface` | `oklch(14% 0.008 175)` | Card/panel backgrounds |
| `--bg-elevated` | `oklch(18% 0.008 175)` | Raised elements, skeletons |
| `--text-primary` | `oklch(95% 0.005 175)` | Headings, primary data (near-white) |
| `--text-secondary` | `oklch(82% 0.01 175)` | Descriptions, supporting data |
| `--text-muted` | `oklch(62% 0.01 175)` | Labels, timestamps |
| `--border` | `oklch(22% 0.01 175)` | Dividers and card borders |

**Named Rules:**
- **Severity Gradient** — Severity maps to color temperature: teal → amber → coral. Never color alone; always pair with text labels.
- **Flat-By-Default** — Surfaces flat at rest. Depth via tonal layering (4 steps), not shadows.

### Typography

| Role | Font | Weight | Size | Usage |
|------|------|--------|------|-------|
| Display | Source Serif 4 | 500 | clamp(2.5rem, 5vw, 4rem) | Hero headlines |
| Headline | Source Serif 4 | 500 | clamp(1.75rem, 3vw, 2.5rem) | Section headings |
| Title | Inter | 600 | 1.5rem | Card titles |
| Body | Inter | 400 | 1rem | Descriptions, root-cause text |
| Label | Inter | 500 | 0.75rem | Metrics, badges |
| Mono | JetBrains Mono | — | — | Numeric data, code |

**Named Rule:** Serif only in display/headline. Body, labels, data always sans.

### Components

| Component | Spec |
|-----------|------|
| **Buttons** | 12px radius, scale(0.97) on :active, transform 160ms ease-out |
| **Cards** | 12px radius, surface bg, 1px border, 20px padding, no shadows |
| **Tables** | Full-width, 1px bottom dividers, monospace for numbers, rows focusable |
| **Badges** | Full-rounded pills — Coral=High, Amber=Medium, Teal-light=Low |
| **Sidebar** | 224px, text-only nav, active = surface bg + 2px left primary border |
| **Skeletons** | Pulsing rectangles in elevated bg, 1.5s infinite animation |
| **Empty States** | Centered column: icon, title, description, optional action |
| **Error Boundary** | Catches crashes, shows message + retry button |

### Animation

- **Scroll reveals** — IntersectionObserver, 250ms ease-out (custom cubic-bezier(0.23, 1, 0.32, 1))
- **Press feedback** — CSS :active { transform: scale(0.97) } on all buttons
- **Reduced motion** — Full `prefers-reduced-motion` support, all transforms disabled
- **No `transition: all`** — Every transition specifies exact properties

---

## Architecture

```
AWS CUR / GCP Billing Export
        │
        ▼
   POST /api/costs  (CSV upload)
        │
        ▼
   CUR Parser (parser.ts)
   - Parse CSV columns
   - Aggregate by day/service/region/account
        │
        ▼
   Z-Score Detection (zscore.ts)
   - Calculate mean + stddev per dimension
   - Flag outliers > 2 stddev from mean
        │
        ▼
   Anomalies Found?
   ├── Yes → LLM Root-Cause → POST /api/alerts → Slack
   └── No  → No action
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Slack webhook URL (for alerts)

### Install

```bash
cd 65-cloud-cost-anomaly/web
npm install
npm run dev
```

Open `http://localhost:3000`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |

---

## API Reference

### POST `/api/costs`

Upload AWS CUR data for anomaly detection.

**Request:** CSV with columns `date, service, region, account, amount, usageQuantity`

**Response:**
```json
{
  "recordsProcessed": 150,
  "days": 30,
  "anomalies": 3,
  "anomaliesList": [...],
  "summary": {
    "totalSpend": 45230.50,
    "averageDailySpend": 1507.68,
    "dateRange": { "start": "2026-07-01", "end": "2026-07-30" }
  }
}
```

### POST `/api/alerts`

Send anomalies to Slack.

**Request:**
```json
{
  "webhookUrl": "https://hooks.slack.com/services/...",
  "anomalies": [{
    "date": "2026-07-15",
    "dimension": "EC2",
    "dimensionType": "service",
    "expected": 1200,
    "actual": 4500,
    "zScore": 3.8,
    "severity": "high"
  }]
}
```

**Response:**
```json
{ "sent": 1, "failed": 0, "total": 1 }
```

---

## Product Strategy

See `PRODUCT.md` for full product requirements, user personas, brand personality, and anti-references.

**Brand voice:** Confident, minimal, technical. Speaks like a senior engineer — precise, no filler, no alarmism.

**Anti-references:** Datadog/CloudHealth (bloated), AWS native anomaly detection (noisy), generic SaaS landing pages (buzzword-heavy).

---

## Design System

See `DESIGN.md` for the full visual design system with OKLCH tokens, typography hierarchy, component specs, and named rules.

---

## License

MIT
