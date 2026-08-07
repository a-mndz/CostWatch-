# Product Requirements Document (PRD)

## Project: Cost-anomaly alerting for AWS/GCP (`65-cloud-cost-anomaly`)

---

## 1. Product Objectives & Scope

### Goals
- Ship MVP within **3-4w** at ~10 hrs/wk founder time.
- Reach 10 paying customers in early validation phase.
- Hold LLM cost to <= 20% of customer revenue per unit.

### Non-Goals
- Anything outside the Second-Build / DevTools wedge.
- Custom integrations not on Stripe / standard APIs / MCP.

---

## 2. User Stories & Workflows

### Persona 1: Buyer / Decision-Maker
- **As a** Eng lead / FinOps at 10-500-employee SaaS on AWS/GCP. Already overspent, looking for control., **I want to** see measurable ROI in week 1, **so that** I keep paying.
- **Acceptance:** Dashboard surfaces per-outcome savings within first session.

### Persona 2: End User / Operator
- **As an** operator, **I want to** approve or correct agent output cheaply, **so that** the workflow stays under my control.
- **Acceptance:** HITL gate on high-impact actions; one-click approval UI; Slack/email notifications.

---

## 3. Key Functional Requirements

### MVP Features
1. **AWS/GCP/Azure cost ingest**
2. **anomaly detection (z-score + LLM)**
3. **root-cause summary**
4. **Slack alert w/ action**

### Post-MVP
1. Multi-tenant RBAC + SSO for B2B expansion.
2. Eval regression suite in CI w/ golden cases.
3. MCP server hosting for adjacent tools.

---

## 4. Non-Functional Requirements

- **Performance:** <2s API response (non-LLM); streamed agent updates.
- **Reliability:** 99.9% uptime target w/ retries + DLQ.
- **Security:** TLS 1.3 in transit, AES-256 at rest, secrets scrubbed from logs.
- **Compliance:** GDPR, status page privacy.

---

## 5. Key Metrics & Success Criteria

- Conversion: >= 5% landing -> trial.
- Churn: < 5% monthly.
- LLM margin: cost <= 20% of customer revenue.
- Eval pass rate: 100% of 3 golden cases before each release.

---

## 6. Failure Modes (must not regress)

- False alarms train users to ignore.
- recommendations degrade prod performance.
- rate-limit on CUR API.
