import { parseCURLine, aggregateByDay } from '@/lib/cost-ingest/parser';

describe('parseCURLine', () => {
  it('parses valid CSV line', () => {
    const result = parseCURLine('2026-01-01,EC2,us-east-1,default,100.50,1000');
    expect(result).toEqual({
      date: '2026-01-01',
      service: 'EC2',
      region: 'us-east-1',
      account: 'default',
      amount: 100.50,
      usageQuantity: 1000,
    });
  });

  it('returns null for too few columns', () => {
    expect(parseCURLine('2026-01-01,EC2')).toBeNull();
  });

  it('returns null for non-numeric amount', () => {
    expect(parseCURLine('2026-01-01,EC2,us-east-1,default,abc,1000')).toBeNull();
  });

  it('handles zero usageQuantity', () => {
    const result = parseCURLine('2026-01-01,S3,us-east-1,default,50,0');
    expect(result?.usageQuantity).toBe(0);
  });

  it('handles empty usageQuantity', () => {
    const result = parseCURLine('2026-01-01,S3,us-east-1,default,50,');
    expect(result?.usageQuantity).toBe(0);
  });

  it('trims whitespace', () => {
    const result = parseCURLine(' 2026-01-01 , EC2 , us-east-1 , default , 100 , 1000 ');
    expect(result?.date).toBe('2026-01-01');
    expect(result?.service).toBe('EC2');
  });
});

describe('aggregateByDay', () => {
  it('groups records by date', () => {
    const records = [
      { date: '2026-01-01', service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usageQuantity: 1000 },
      { date: '2026-01-01', service: 'S3', region: 'us-east-1', account: 'default', amount: 50, usageQuantity: 500 },
      { date: '2026-01-02', service: 'EC2', region: 'us-east-1', account: 'default', amount: 120, usageQuantity: 1200 },
    ];
    const summaries = aggregateByDay(records);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].total).toBe(150);
    expect(summaries[1].total).toBe(120);
  });

  it('sorts by date ascending', () => {
    const records = [
      { date: '2026-01-03', service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usageQuantity: 0 },
      { date: '2026-01-01', service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usageQuantity: 0 },
    ];
    const summaries = aggregateByDay(records);
    expect(summaries[0].date).toBe('2026-01-01');
    expect(summaries[1].date).toBe('2026-01-03');
  });

  it('aggregates by service', () => {
    const records = [
      { date: '2026-01-01', service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usageQuantity: 0 },
      { date: '2026-01-01', service: 'EC2', region: 'us-west-2', account: 'default', amount: 50, usageQuantity: 0 },
    ];
    const summaries = aggregateByDay(records);
    expect(summaries[0].byService['EC2']).toBe(150);
  });

  it('handles empty input', () => {
    expect(aggregateByDay([])).toHaveLength(0);
  });
});
