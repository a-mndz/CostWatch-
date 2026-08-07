import { buildSlackMessage, Anomaly } from '@/lib/alerts/slack';

describe('Slack alerts', () => {
  const baseAnomaly: Anomaly = {
    date: '2026-01-31',
    dimension: 'EC2',
    dimensionType: 'service',
    expected: 100,
    actual: 500,
    zScore: 4.5,
    severity: 'high',
  };

  it('builds valid payload with blocks', () => {
    const message = buildSlackMessage(baseAnomaly);
    expect(message).toHaveProperty('blocks');
    expect(Array.isArray((message as any).blocks)).toBe(true);
  });

  it('includes anomaly details in text', () => {
    const message = buildSlackMessage(baseAnomaly);
    const str = JSON.stringify(message);
    expect(str).toContain('EC2');
    expect(str).toContain('4.50');
    expect(str).toContain('$100');
    expect(str).toContain('$500');
  });

  it('shows direction of change', () => {
    const increase = buildSlackMessage(baseAnomaly);
    expect(JSON.stringify(increase)).toContain('increased');

    const decrease: Anomaly = { ...baseAnomaly, actual: 10 };
    const decreaseMsg = buildSlackMessage(decrease);
    expect(JSON.stringify(decreaseMsg)).toContain('decreased');
  });

  it('handles different severity levels', () => {
    for (const severity of ['low', 'medium', 'high'] as const) {
      const msg = buildSlackMessage({ ...baseAnomaly, severity });
      expect(msg).toHaveProperty('blocks');
    }
  });

  it('handles different dimension types', () => {
    for (const dimensionType of ['service', 'region', 'account', 'total'] as const) {
      const msg = buildSlackMessage({ ...baseAnomaly, dimensionType });
      expect(msg).toHaveProperty('blocks');
    }
  });
});
