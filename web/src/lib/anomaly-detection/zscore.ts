export interface Anomaly {
  date: string;
  dimension: string;
  dimensionType: 'service' | 'region' | 'account' | 'total';
  expected: number;
  actual: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high';
}

export interface DailyCostSummary {
  date: string;
  total: number;
  byService: Record<string, number>;
  byRegion: Record<string, number>;
  byAccount: Record<string, number>;
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function detectAnomaliesForDimension(
  values: { date: string; value: number }[],
  dimension: string,
  dimensionType: Anomaly['dimensionType'],
  threshold: number = 2.5
): Anomaly[] {
  if (values.length < 7) return [];

  const nums = values.map((v) => v.value);
  const mean = calculateMean(nums);
  const stdDev = calculateStdDev(nums, mean);

  if (stdDev === 0) return [];

  const anomalies: Anomaly[] = [];

  for (const { date, value } of values) {
    const zScore = (value - mean) / stdDev;

    if (Math.abs(zScore) > threshold) {
      anomalies.push({
        date,
        dimension,
        dimensionType,
        expected: mean,
        actual: value,
        zScore,
        severity: Math.abs(zScore) > 3.5 ? 'high' : Math.abs(zScore) > 3 ? 'medium' : 'low',
      });
    }
  }

  return anomalies;
}

export function detectAnomalies(
  summaries: DailyCostSummary[],
  threshold: number = 2.5
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Total spend anomalies
  const totalValues = summaries.map((s) => ({ date: s.date, value: s.total }));
  anomalies.push(...detectAnomaliesForDimension(totalValues, 'total', 'total', threshold));

  // Per-service anomalies
  const allServices = new Set<string>();
  for (const s of summaries) {
    for (const service of Object.keys(s.byService)) {
      allServices.add(service);
    }
  }

  for (const service of allServices) {
    const values = summaries.map((s) => ({
      date: s.date,
      value: s.byService[service] || 0,
    }));
    anomalies.push(...detectAnomaliesForDimension(values, service, 'service', threshold));
  }

  // Per-region anomalies
  const allRegions = new Set<string>();
  for (const s of summaries) {
    for (const region of Object.keys(s.byRegion)) {
      allRegions.add(region);
    }
  }

  for (const region of allRegions) {
    const values = summaries.map((s) => ({
      date: s.date,
      value: s.byRegion[region] || 0,
    }));
    anomalies.push(...detectAnomaliesForDimension(values, region, 'region', threshold));
  }

  // Per-account anomalies
  const allAccounts = new Set<string>();
  for (const s of summaries) {
    for (const account of Object.keys(s.byAccount)) {
      allAccounts.add(account);
    }
  }

  for (const account of allAccounts) {
    const values = summaries.map((s) => ({
      date: s.date,
      value: s.byAccount[account] || 0,
    }));
    anomalies.push(...detectAnomaliesForDimension(values, account, 'account', threshold));
  }

  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}
