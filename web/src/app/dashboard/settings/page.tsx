'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '../../components/Skeleton';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { apiFetch } from '@/lib/api';

interface CloudAccount {
  id: number; provider: string; label: string; account_id: string;
  role_arn: string | null; project_id: string | null; endpoint_url: string | null;
  status: string; last_sync: string | null;
}

function SettingsContent() {
  const [tab, setTab] = useState<'upload' | 'aws' | 'gcp' | 'custom'>('upload');
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AWS form
  const [awsLabel, setAwsLabel] = useState('');
  const [awsAccountId, setAwsAccountId] = useState('');
  const [awsRoleArn, setAwsRoleArn] = useState('');
  const [awsExternalId, setAwsExternalId] = useState('');

  // GCP form
  const [gcpLabel, setGcpLabel] = useState('');
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpServiceAccount, setGcpServiceAccount] = useState('');

  // Custom form
  const [customLabel, setCustomLabel] = useState('');
  const [customAccountId, setCustomAccountId] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');

  // SMTP form
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [alertEmail, setAlertEmail] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/settings').then(r => r.json()),
      apiFetch('/api/connect').then(r => r.json()),
    ]).then(([settings, connect]) => {
      setWebhookUrl(settings.webhookUrl || '');
      setSmtpHost(settings.smtpHost || '');
      setSmtpPort(settings.smtpPort || '587');
      setSmtpUser(settings.smtpUser || '');
      setSmtpPass(settings.smtpPass || '');
      setSmtpFrom(settings.smtpFrom || '');
      setAlertEmail(settings.alertEmail || '');
      setAccounts(connect.accounts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      setMessage(null);
      const text = await file.text();
      try {
        const res = await fetch('/api/costs', { method: 'POST', body: text });
        const data = await res.json();
        if (res.ok) {
          setMessage({ type: 'success', text: `Processed ${data.recordsProcessed} records. ${data.anomalies} anomalies detected.` });
        } else {
          setMessage({ type: 'error', text: data.error || 'Upload failed.' });
        }
      } catch {
        setMessage({ type: 'error', text: 'Network error.' });
      }
      setUploading(false);
    };
    input.click();
  }

  async function handleConnectAWS() {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'aws',
          label: awsLabel,
          accountId: awsAccountId,
          roleArn: awsRoleArn,
          externalId: awsExternalId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'AWS account connected.' });
        setAwsLabel(''); setAwsAccountId(''); setAwsRoleArn(''); setAwsExternalId('');
        const fresh = await apiFetch('/api/connect').then(r => r.json());
        setAccounts(fresh.accounts || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    }
    setConnecting(false);
  }

  async function handleConnectGCP() {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gcp',
          label: gcpLabel,
          accountId: gcpProjectId,
          projectId: gcpProjectId,
          serviceAccountKey: gcpServiceAccount || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'GCP project connected.' });
        setGcpLabel(''); setGcpProjectId(''); setGcpServiceAccount('');
        const fresh = await apiFetch('/api/connect').then(r => r.json());
        setAccounts(fresh.accounts || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    }
    setConnecting(false);
  }

  async function handleConnectCustom() {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'custom',
          label: customLabel,
          accountId: customAccountId || 'custom',
          endpointUrl: customEndpoint,
          apiKey: customApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Custom provider connected.' });
        setCustomLabel(''); setCustomAccountId(''); setCustomEndpoint(''); setCustomApiKey('');
        const fresh = await apiFetch('/api/connect').then(r => r.json());
        setAccounts(fresh.accounts || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    }
    setConnecting(false);
  }

  async function handleDisconnect(id: number) {
    if (!confirm('Disconnect this account?')) return;
    await apiFetch(`/api/connect?id=${id}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.id !== id));
    setMessage({ type: 'success', text: 'Account disconnected.' });
  }

  async function handleSaveWebhook() {
    setMessage(null);
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl,
        smtpHost,
        smtpPort: smtpPort ? Number(smtpPort) : undefined,
        smtpUser,
        smtpPass,
        smtpFrom,
        alertEmail,
      }),
    });
    const data = await res.json();
    setMessage(res.ok
      ? { type: 'success', text: 'Settings saved.' }
      : { type: 'error', text: data.error || 'Failed.' }
    );
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  if (loading) {
    return <div><Skeleton className="h-8 w-24 mb-4" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Connect data sources and configure alerts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
        {[
          { key: 'upload' as const, label: 'CSV Upload' },
          { key: 'aws' as const, label: 'Connect AWS' },
          { key: 'gcp' as const, label: 'Connect GCP' },
          { key: 'custom' as const, label: 'Custom Cloud' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMessage(null); }}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
            style={{
              backgroundColor: tab === t.key ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: message.type === 'success' ? 'oklch(20% 0.05 145)' : 'oklch(20% 0.05 25)',
            color: message.type === 'success' ? 'var(--color-primary-light)' : 'var(--color-tertiary)',
            border: `1px solid ${message.type === 'success' ? 'oklch(30% 0.08 145)' : 'oklch(30% 0.08 25)'}`,
          }}>
          {message.text}
        </div>
      )}

      {/* CSV Upload Tab */}
      {tab === 'upload' && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Upload Cost Data</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Upload an AWS Cost & Usage Report (CUR) CSV file. Format: <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>date,service,region,account,amount,usageQuantity</code>
          </p>
          <button onClick={handleUpload} disabled={uploading}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
            {uploading ? 'Uploading...' : 'Select CSV File'}
          </button>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            A sample file is included at <code>web/sample-data.csv</code>
          </p>
        </div>
      )}

      {/* AWS Tab */}
      {tab === 'aws' && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connect AWS Account</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Link your AWS account via IAM role. CostWatch assumes a cross-account role to read Cost Explorer data.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
              <input value={awsLabel} onChange={e => setAwsLabel(e.target.value)}
                placeholder="Production AWS"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>AWS Account ID</label>
              <input value={awsAccountId} onChange={e => setAwsAccountId(e.target.value)}
                placeholder="123456789012"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>IAM Role ARN</label>
              <input value={awsRoleArn} onChange={e => setAwsRoleArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/CostWatchRole"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>External ID (optional)</label>
              <input value={awsExternalId} onChange={e => setAwsExternalId(e.target.value)}
                placeholder="costwatch-external-id"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
          </div>

          <button onClick={handleConnectAWS} disabled={connecting || !awsLabel || !awsAccountId || !awsRoleArn}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
            {connecting ? 'Connecting...' : 'Connect AWS Account'}
          </button>
        </div>
      )}

      {/* GCP Tab */}
      {tab === 'gcp' && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connect GCP Project</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Link your GCP project via service account. Enable billing export to BigQuery first.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
              <input value={gcpLabel} onChange={e => setGcpLabel(e.target.value)}
                placeholder="Production GCP"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Project ID</label>
              <input value={gcpProjectId} onChange={e => setGcpProjectId(e.target.value)}
                placeholder="my-gcp-project"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Service Account Key (JSON, optional)</label>
              <textarea value={gcpServiceAccount} onChange={e => setGcpServiceAccount(e.target.value)}
                placeholder='{"type": "service_account", ...}'
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 font-mono"
                style={inputStyle} />
            </div>
          </div>

          <button onClick={handleConnectGCP} disabled={connecting || !gcpLabel || !gcpProjectId}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
            {connecting ? 'Connecting...' : 'Connect GCP Project'}
          </button>
        </div>
      )}

      {/* Custom Cloud Tab */}
      {tab === 'custom' && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connect Custom Cloud</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Connect any cloud provider via a cost data API. Provide an endpoint URL that returns cost data as JSON.
          </p>
          <div className="rounded-lg p-4 mb-4 text-xs font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>Expected response format:</p>
            <pre>{`[
  {
    "date": "2026-01-15",
    "service": "compute",
    "region": "us-east-1",
    "amount": 123.45,
    "usage_quantity": 100
  }
]`}</pre>
            <p className="mt-2">Or: <code>{`{ "costs": [...] }`}</code></p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
              <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                placeholder="Production Azure"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Account ID</label>
              <input value={customAccountId} onChange={e => setCustomAccountId(e.target.value)}
                placeholder="my-account-id (optional)"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Endpoint URL</label>
              <input value={customEndpoint} onChange={e => setCustomEndpoint(e.target.value)}
                placeholder="https://api.example.com/costs"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>API Key (optional)</label>
              <input value={customApiKey} onChange={e => setCustomApiKey(e.target.value)} type="password"
                placeholder="Bearer token or API key"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
          </div>

          <button onClick={handleConnectCustom} disabled={connecting || !customLabel || !customEndpoint}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
            {connecting ? 'Connecting...' : 'Connect Custom Provider'}
          </button>
        </div>
      )}

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Connected Accounts</h2>
          <div className="space-y-3">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{a.provider === 'aws' ? '☁️' : a.provider === 'gcp' ? '🔷' : '🔗'}</span>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {a.provider.toUpperCase()} · {a.account_id} · {a.status}
                      {a.last_sync && ` · Last sync: ${new Date(a.last_sync).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => {
                    const res = await apiFetch('/api/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ accountId: a.id }),
                    });
                    const data = await res.json();
                    alert(data.message || data.error || 'Sync complete');
                  }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    Sync
                  </button>
                  <button onClick={() => handleDisconnect(a.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{ color: 'var(--color-tertiary)' }}>
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Settings */}
      <div className="mt-8 rounded-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Alert Settings</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Configure how you receive anomaly alerts. Both Slack and email are optional.
        </p>

        {/* Slack */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Slack Webhook</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer"
              className="underline" style={{ color: 'var(--color-primary-light)' }}>
              Create webhook →
            </a>
          </p>
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
            style={inputStyle} />
        </div>

        {/* SMTP */}
        <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Email (SMTP)</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Optional. Send anomaly alerts via email.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>SMTP Host</label>
              <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Port</label>
              <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)}
                placeholder="587"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Username</label>
              <input value={smtpUser} onChange={e => setSmtpUser(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input value={smtpPass} onChange={e => setSmtpPass(e.target.value)} type="password"
                placeholder="App password"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>From Email</label>
              <input value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)}
                placeholder="alerts@costwatch.app"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Alert Recipient</label>
              <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
                placeholder="team@company.com"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
          </div>
        </div>

        <button onClick={handleSaveWebhook}
          className="mt-4 px-5 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <SettingsContent />
    </ErrorBoundary>
  );
}
