import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { insertCosts } from '../db';

interface AWSAccount {
  account_id: string;
  role_arn: string;
  external_id: string | null;
}

async function getCredentials(account: AWSAccount) {
  const sts = new STSClient({ region: 'us-east-1' });
  const result = await sts.send(new AssumeRoleCommand({
    RoleArn: account.role_arn,
    RoleSessionName: 'costwatch-sync',
    ExternalId: account.external_id || undefined,
    DurationSeconds: 3600,
  }));

  if (!result.Credentials) throw new Error('Failed to assume role');
  return {
    accessKeyId: result.Credentials.AccessKeyId!,
    secretAccessKey: result.Credentials.SecretAccessKey!,
    sessionToken: result.Credentials.SessionToken!,
  };
}

export async function syncAWSCosts(account: AWSAccount) {
  const creds = await getCredentials(account);
  const client = new CostExplorerClient({ region: 'us-east-1', credentials: creds });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const result = await client.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    GroupBy: [
      { Type: 'DIMENSION', Key: 'SERVICE' },
      { Type: 'DIMENSION', Key: 'REGION' },
    ],
  }));

  const rows = [];
  for (const resultItem of result.ResultsByTime || []) {
    for (const group of resultItem.Groups || []) {
      rows.push({
        date: resultItem.TimePeriod?.Start || '',
        service: group.Keys?.[0] || 'Unknown',
        region: group.Keys?.[1] || 'unknown',
        account: account.account_id,
        amount: parseFloat(group.Metrics?.UnblendedCost?.Amount || '0'),
        usage_quantity: 0,
      });
    }
  }

  if (rows.length > 0) insertCosts(rows);
  return rows.length;
}

export async function testAWSConnection(account: AWSAccount): Promise<{ success: boolean; message: string }> {
  try {
    await getCredentials(account);
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err}` };
  }
}
