import { NextRequest, NextResponse } from 'next/server';
import { parseCURLine, aggregateByDay } from '@/lib/cost-ingest/parser';
import { detectAnomalies } from '@/lib/anomaly-detection/zscore';
import { insertCosts, insertAnomaly, getCostsByDay, getCostsByService, getCostSummary, getOpenAnomalyCount, getAnomalies, getConfig, logAlert } from '@/lib/db';
import { sendSlackAlert, Anomaly } from '@/lib/alerts/slack';
import { sendAlertEmail } from '@/lib/alerts/email';
import { requireUser } from '@/lib/require-user';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api-error';

function buildEmailHtml(a: Anomaly): string {
  const change = a.actual - a.expected;
  const changePercent = ((change / a.expected) * 100).toFixed(1);
  const direction = change > 0 ? 'increased' : 'decreased';
  const color = a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#f59e0b' : '#22c55e';
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:${color};color:white;padding:16px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:18px">⚠️ Cost Anomaly Detected</h1>
      </div>
      <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#64748b">Dimension</td><td style="padding:8px 0;font-weight:600">${a.dimension}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Date</td><td style="padding:8px 0;font-weight:600">${a.date}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Expected</td><td style="padding:8px 0;font-weight:600">$${a.expected.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Actual</td><td style="padding:8px 0;font-weight:600">$${a.actual.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Change</td><td style="padding:8px 0;font-weight:600;color:${color}">${direction} ${changePercent}%</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Z-Score</td><td style="padding:8px 0;font-weight:600">${a.zScore.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Severity</td><td style="padding:8px 0;font-weight:600;color:${color}">${a.severity.toUpperCase()}</td></tr>
        </table>
        <a href="https://costwatch.app/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#0d9488;color:white;text-decoration:none;border-radius:6px;font-weight:600">View Dashboard</a>
      </div>
    </div>`;
}

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
  const smtpHost = getConfig(userId, 'smtp_host');
  const alertEmail = getConfig(userId, 'alert_email');
  let alertsSent = 0;

  for (const a of anomalies) {
    const result = insertAnomaly(userId, {
      date: a.date, service: a.dimension, region: 'unknown',
      expected: a.expected, actual: a.actual, z_score: a.zScore, severity: a.severity,
      root_cause: undefined,
    });

    // Slack alert
    if (webhookUrl && result.lastInsertRowid) {
      const sent = await sendSlackAlert({ webhookUrl }, a);
      if (sent) { logAlert(userId, Number(result.lastInsertRowid), 'slack'); alertsSent++; }
    }

    // Email alert
    if (smtpHost && alertEmail && result.lastInsertRowid) {
      const emailSent = await sendAlertEmail(
        { host: smtpHost, port: Number(getConfig(userId, 'smtp_port') || '587'), user: getConfig(userId, 'smtp_user') || '', pass: getConfig(userId, 'smtp_pass') || '', from: getConfig(userId, 'smtp_from') || '' },
        alertEmail,
        `⚠️ Cost Anomaly: ${a.dimension} ${a.severity.toUpperCase()}`,
        buildEmailHtml(a),
      );
      if (emailSent) { logAlert(userId, Number(result.lastInsertRowid), 'email'); alertsSent++; }
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
