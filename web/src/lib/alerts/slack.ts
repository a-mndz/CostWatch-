export interface Anomaly {
  date: string;
  dimension: string;
  dimensionType: 'service' | 'region' | 'account' | 'total';
  expected: number;
  actual: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high';
}

interface SlackConfig {
  webhookUrl: string;
  channel?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getSeverityEmoji(severity: Anomaly['severity']): string {
  switch (severity) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
  }
}

function getDimensionLabel(dimensionType: Anomaly['dimensionType']): string {
  switch (dimensionType) {
    case 'service':
      return 'Service';
    case 'region':
      return 'Region';
    case 'account':
      return 'Account';
    case 'total':
      return 'Total Spend';
  }
}

export function buildSlackMessage(anomaly: Anomaly): object {
  const change = anomaly.actual - anomaly.expected;
  const changePercent = ((change / anomaly.expected) * 100).toFixed(1);
  const direction = change > 0 ? 'increased' : 'decreased';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${getSeverityEmoji(anomaly.severity)} Cost Anomaly Detected`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Dimension:*\n${getDimensionLabel(anomaly.dimensionType)}: ${anomaly.dimension}`,
          },
          {
            type: 'mrkdwn',
            text: `*Date:*\n${anomaly.date}`,
          },
          {
            type: 'mrkdwn',
            text: `*Expected:*\n${formatCurrency(anomaly.expected)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Actual:*\n${formatCurrency(anomaly.actual)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Change:*\n${direction} ${changePercent}%`,
          },
          {
            type: 'mrkdwn',
            text: `*Z-Score:*\n${anomaly.zScore.toFixed(2)}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
            },
            url: 'https://costwatch.app/dashboard',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Acknowledge',
            },
            style: 'primary',
            value: `acknowledge_${anomaly.date}_${anomaly.dimension}`,
          },
        ],
      },
    ],
  };
}

export async function sendSlackAlert(
  config: SlackConfig,
  anomaly: Anomaly
): Promise<boolean> {
  const message = buildSlackMessage(anomaly);

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch {
    return false;
  }
}
