# 65. Cost-anomaly alerting for AWS/GCP

**Source:** `../100-project-plan.md` row 65
**Category:** Second-Build / DevTools
**Ratings:** Demand=H | Effort=M | Monetization=fast | Difficulty=Mid | Time=3-4w

## Why this one

FinOps spend is real; narrow scope.

## Pain

AWS bills surprise eng teams every quarter; native Anomaly Detection is opt-in and noisy; third-party (Vantage, CloudHealth) costs $500+/mo.

## Buyer

Eng lead / FinOps at 10-500-employee SaaS on AWS/GCP. Already overspent, looking for control.

## Competitors & wedge

Vantage, CloudHealth, AWS Cost Anomaly Detection (noisy). Wedge = cheaper + root-cause summary + Slack-actionable.

## Distribution

Dev/FinOps communities (FinOps Foundation, r/aws); CTO newsletters.

## 2026 signal

price wedge vs incumbent (BetterStack/Datadog)

## Validation (week 1-2)

- [ ] 1-page landing w/ the DevTools wedge
- [ ] 20 cold outreach messages in target niche (kill: <5/20 replies)
- [ ] 10 paying pilots as validation milestone

## Build rules

- Stripe from day 1 (charge from day 1, even $9/mo).
- AWS Cost & Usage Report ingest; ClickHouse for analytics; Claude 3.5 for root-cause; Slack alert w/ runbook link.
- LLM cost <= 20% of price at target usage; per-outcome pricing where the unit is observable.
- Compliance anchors: GDPR, status page privacy.

## Core MVP features

- AWS/GCP/Azure cost ingest
- anomaly detection (z-score + LLM)
- root-cause summary
- Slack alert w/ action

## Eval cases (ship before each release)

- Anomaly precision >80% on 6-month synthetic billing data.
- false-alarm rate <5%.
- cost-reduction recommendations defensible on AWS engineer review.

## Known failure modes

- False alarms train users to ignore.
- recommendations degrade prod performance.
- rate-limit on CUR API.

## Status

- [ ] Validated
- [ ] MVP built
- [ ] First paying customer
