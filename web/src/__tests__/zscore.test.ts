import { detectAnomalies, DailyCostSummary } from '@/lib/anomaly-detection/zscore';

function makeSummary(date: string, serviceAmounts: Record<string, number>, totalOverride?: number): DailyCostSummary {
  const byService: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byAccount: Record<string, number> = {};
  let total = 0;

  for (const [service, amount] of Object.entries(serviceAmounts)) {
    byService[service] = amount;
    byRegion['us-east-1'] = (byRegion['us-east-1'] || 0) + amount;
    byAccount['default'] = (byAccount['default'] || 0) + amount;
    total += amount;
  }

  return {
    date,
    total: totalOverride ?? total,
    byService,
    byRegion,
    byAccount,
  };
}

describe('detectAnomalies', () => {
  // Use varied base data so std dev > 0
  const baseSummaries: DailyCostSummary[] = Array.from({ length: 30 }, (_, i) =>
    makeSummary(`2026-01-${String(i + 1).padStart(2, '0')}`, { EC2: 95 + (i % 10) })
  );

  it('detects high anomaly (spike)', () => {
    const summaries = [...baseSummaries, makeSummary('2026-01-31', { EC2: 500 })];
    const anomalies = detectAnomalies(summaries);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].severity).toBe('high');
  });

  it('detects low anomaly (drop)', () => {
    const summaries = [...baseSummaries, makeSummary('2026-01-31', { EC2: 5 })];
    const anomalies = detectAnomalies(summaries);
    expect(anomalies.length).toBeGreaterThan(0);
  });

  it('returns empty when history too short (<7 days)', () => {
    const summaries = Array.from({ length: 5 }, (_, i) =>
      makeSummary(`2026-01-${String(i + 1).padStart(2, '0')}`, { EC2: 100 })
    );
    summaries.push(makeSummary('2026-01-06', { EC2: 500 }));
    const anomalies = detectAnomalies(summaries);
    expect(anomalies).toHaveLength(0);
  });

  it('detects total spend anomalies', () => {
    const summaries = [...baseSummaries, makeSummary('2026-01-31', { EC2: 100 }, 1000)];
    const anomalies = detectAnomalies(summaries);
    expect(anomalies.some(a => a.dimensionType === 'total')).toBe(true);
  });
});
