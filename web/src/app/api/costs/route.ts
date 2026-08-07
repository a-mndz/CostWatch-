import { NextRequest, NextResponse } from 'next/server';
import { parseCURLine, aggregateByDay } from '@/lib/cost-ingest/parser';
import { detectAnomalies } from '@/lib/anomaly-detection/zscore';
import { insertCosts, insertAnomaly, getCostsByDay, getCostsByService, getCostSummary, getOpenAnomalyCount, getAnomalies, getConfig, logAlert } from '@/lib/db';
import { sendSlackAlert } from '@/lib/alerts/slack';
import { requireUser } from '@/lib/require-user';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api-error';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const rl = rateLimit('costs:post', 20, 60000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const userId = await requireUser();
  const body = await request.text();
  const lines = body.split('\n').filter((line) => line.trim());
  const records = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const record = parseCURLine(lines[i]);
    if (record) records.push(record);
    else errors.push(`Line ${i + 1}: invalid format`);
  }

  if (records.length === 0) {
    return NextResponse.json({ error: 'No valid records found', errors }, { status: 400 });
  }

  insertCosts(userId, records.map(r => ({
    date: r.date, service: r.service, region: r.region, account: r.account, amount: r.amount, usage_quantity: r.usageQuantity,
  })));

  const summaries = aggregateByDay(records);
  const anomalies = detectAnomalies(summaries);
  const webhookUrl = getConfig(userId, 'slack_webhook_url');
  let alertsSent = 0;

  for (const a of anomalies) {
    const result = insertAnomaly(userId, {
      date: a.date, service: a.dimension, region: 'unknown',
      expected: a.expected, actual: a.actual, z_score: a.zScore, severity: a.severity,
    });
    if (webhookUrl && result.lastInsertRowid) {
      const sent = await sendSlackAlert({ webhookUrl }, a);
      if (sent) { logAlert(userId, Number(result.lastInsertRowid), '#cost-alerts'); alertsSent++; }
    }
  }

  logger.info('Costs uploaded', { userId, records: records.length, anomalies: anomalies.length });
  return NextResponse.json({
    recordsProcessed: records.length, days: summaries.length, anomalies: anomalies.length, alertsSent,
    summary: {
      totalSpend: summaries.reduce((sum, s) => sum + s.total, 0),
      averageDailySpend: summaries.reduce((sum, s) => sum + s.total, 0) / summaries.length,
      dateRange: { start: summaries[0].date, end: summaries[summaries.length - 1].date },
    },
  });
});

export const GET = withErrorHandling(async () => {
  const userId = await requireUser();
  return NextResponse.json({
    daily: getCostsByDay(userId, 30),
    byService: getCostsByService(userId),
    summary: getCostSummary(userId),
    openAnomalies: getOpenAnomalyCount(userId),
    anomalies: getAnomalies(userId),
  });
});
