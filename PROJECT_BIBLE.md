# Project Bible: Cost-anomaly alerting for AWS/GCP

## 1. Executive Summary & Vision

**Project ID:** `65-cloud-cost-anomaly`
**Category:** Second-Build / DevTools
**Strategic Goal:** Ship a 3-4w MVP that charges from day 1 and hits $5K-10K MRR by week 12.

### Product Vision
Pain wedge: AWS bills surprise eng teams every quarter; native Anomaly Detection is opt-in and noisy; third-party (Vantage, CloudHealth) costs $500+/mo.

**Why now (2026).** price wedge vs incumbent (BetterStack/Datadog)

---

## 2. Core Market Problem & Opportunity

### The Problem
AWS bills surprise eng teams every quarter; native Anomaly Detection is opt-in and noisy; third-party (Vantage, CloudHealth) costs $500+/mo.

### Market Opportunity
Demand **H**, effort **M**, difficulty **Mid**. Market timing aligns with 2026 forcing functions: GDPR, status page privacy; per-outcome pricing becoming the norm; Cursor-outrage making cost-transparency a feature.

---

## 3. Target Audience & Customer Personas

- **Primary Buyer:** Eng lead / FinOps at 10-500-employee SaaS on AWS/GCP. Already overspent, looking for control.
- **End User:** Operator or specialist running the workflow daily.
- **Pain Point:** AWS bills surprise eng teams every quarter; native Anomaly Detection is opt-in and noisy; third-party (Vantage, CloudHealth) costs $500+/mo.

---

## 4. Value Proposition & Competitive Moat

- Vantage, CloudHealth, AWS Cost Anomaly Detection (noisy). Wedge = cheaper + root-cause summary + Slack-actionable.
- **Cost transparency** as a feature (per-action / per-outcome surfaced to user).
- **Compliance built-in:** GDPR, status page privacy.
- **Eval harness in CI** = hiring + retention moat.

---

## 5. Business & Pricing Model

- **Pricing:** Hybrid subscription + per-outcome where unit is observable.
- **Base:** $29-99/mo (initial usage quota).
- **Outcome:** Per processed / resolved / completed unit.
- **Margin target:** >= 80% gross.

---

## 6. Technology Stack & Boundaries

- **Stack:** AWS Cost & Usage Report ingest; ClickHouse for analytics; Claude 3.5 for root-cause; Slack alert w/ runbook link.
- **MCP-first** for tool integration; multi-provider LLM gateway with fallback.
- **Eval harness:** golden-set versioning + LLM-as-judge where appropriate.

---

## 7. Regulatory & Compliance Alignment

- **GDPR**
- **status page privacy**

- HITL gate on any high-impact / irreversible action.
- Audit log for every mutating call; PII scrubbing before any LLM context.
