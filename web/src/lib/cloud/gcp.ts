import { BigQuery } from '@google-cloud/bigquery';
import { insertCosts } from '../db';

interface GCPAccount {
  project_id: string;
  service_account_key: string | null;
}

function getBigQuery(account: GCPAccount): BigQuery {
  const options: Record<string, unknown> = { projectId: account.project_id };
  if (account.service_account_key) {
    try { options.credentials = JSON.parse(account.service_account_key); } catch {}
  }
  return new BigQuery(options);
}

export async function syncGCPCosts(account: GCPAccount) {
  const bigquery = getBigQuery(account);

  const [rows] = await bigquery.query({
    query: `
      SELECT DATE(usage_start_time) as usage_date, service.description as service,
        location.region as region, SUM(cost) as amount, SUM(usage.amount) as usage_quantity
      FROM \`${account.project_id}.gcp_billing_export.gcp_billing_export_v1_*\`
      WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      GROUP BY usage_date, service, region ORDER BY usage_date
    `,
    location: 'US',
  });

  const costRows = rows.map((row: Record<string, unknown>) => ({
    date: (row.usage_date as Date).toISOString().split('T')[0],
    service: (row.service as string) || 'Unknown',
    region: (row.region as string) || 'unknown',
    account: account.project_id,
    amount: Number(row.amount) || 0,
    usage_quantity: Number(row.usage_quantity) || 0,
  }));

  if (costRows.length > 0) insertCosts(costRows);
  return costRows.length;
}

export async function testGCPConnection(account: GCPAccount): Promise<{ success: boolean; message: string }> {
  try {
    const bigquery = getBigQuery(account);
    await bigquery.getDatasets({ maxResults: 1 });
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err}` };
  }
}
