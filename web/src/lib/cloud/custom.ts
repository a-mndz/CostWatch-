import { logger } from '@/lib/logger';
import { retry } from '@/lib/retry';

interface CustomCostRow {
  date: string;
  service: string;
  region: string;
  account: string;
  amount: number;
  usage_quantity: number;
}

interface CustomProviderConfig {
  endpoint_url: string;
  api_key: string | null;
  account_id: string;
}

export async function fetchCustomCosts(config: CustomProviderConfig): Promise<{ success: boolean; rows?: CustomCostRow[]; error?: string }> {
  return retry(async () => {
    logger.info('Fetching custom cloud costs', { endpoint: config.endpoint_url });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    const res = await fetch(config.endpoint_url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`Custom provider returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    // Expect array of cost rows or { costs: [...] }
    const raw = Array.isArray(data) ? data : data.costs || data.data || [];

    const rows: CustomCostRow[] = raw.map((r: Record<string, unknown>) => ({
      date: String(r.date || r.Date || r.timestamp || ''),
      service: String(r.service || r.Service || r.provider || 'custom'),
      region: String(r.region || r.Region || 'unknown'),
      account: config.account_id,
      amount: Number(r.amount || r.cost || r.spend || 0),
      usage_quantity: Number(r.usage_quantity || r.usage || 0),
    })).filter((r: CustomCostRow) => r.date && r.amount > 0);

    logger.info('Custom costs fetched', { count: rows.length });
    return { success: true, rows };
  }, { retries: 2, delay: 1000 });
}

export async function testCustomConnection(config: CustomProviderConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    const res = await fetch(config.endpoint_url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    if (!Array.isArray(data) && !data.costs && !data.data) {
      return { success: false, error: 'Response is not an array or { costs: [...] }' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
