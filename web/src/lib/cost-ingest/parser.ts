export interface CostRecord {
  date: string;
  service: string;
  region: string;
  account: string;
  amount: number;
  usageQuantity: number;
}

export interface DailyCostSummary {
  date: string;
  total: number;
  byService: Record<string, number>;
  byRegion: Record<string, number>;
  byAccount: Record<string, number>;
}

export function parseCURLine(line: string): CostRecord | null {
  const parts = line.split(',');
  if (parts.length < 6) return null;

  const [date, service, region, account, amount, usageQuantity] = parts;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) return null;

  return {
    date: date.trim(),
    service: service.trim(),
    region: region.trim(),
    account: account.trim(),
    amount: parsedAmount,
    usageQuantity: parseFloat(usageQuantity) || 0,
  };
}

export function aggregateByDay(records: CostRecord[]): DailyCostSummary[] {
  const byDate = new Map<string, CostRecord[]>();

  for (const record of records) {
    const existing = byDate.get(record.date) || [];
    existing.push(record);
    byDate.set(record.date, existing);
  }

  const summaries: DailyCostSummary[] = [];

  for (const [date, dayRecords] of byDate) {
    const byService: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const byAccount: Record<string, number> = {};
    let total = 0;

    for (const record of dayRecords) {
      total += record.amount;
      byService[record.service] = (byService[record.service] || 0) + record.amount;
      byRegion[record.region] = (byRegion[record.region] || 0) + record.amount;
      byAccount[record.account] = (byAccount[record.account] || 0) + record.amount;
    }

    summaries.push({
      date,
      total,
      byService,
      byRegion,
      byAccount,
    });
  }

  return summaries.sort((a, b) => a.date.localeCompare(b.date));
}
