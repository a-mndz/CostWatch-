'use client';

import { useState, useEffect } from 'react';
import { SkeletonTable } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBoundary } from '../../components/ErrorBoundary';

interface Anomaly {
  id: number; date: string; service: string; region: string;
  expected: number; actual: number; z_score: number;
  severity: string; status: string; root_cause: string;
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function AnomaliesContent() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/costs')
      .then(r => r.json())
      .then(d => { setAnomalies(d.anomalies || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function updateStatus(id: number, status: string) {
    await fetch('/api/anomalies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function sendAlert() {
    const openIds = anomalies.filter(a => a.status === 'open').map(a => a.id);
    if (openIds.length === 0) return;
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anomalyIds: openIds }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Sent ${data.sent} alerts to Slack.`);
    } else {
      alert(data.error || 'Failed to send alerts.');
    }
  }

  if (loading) {
    return <div><SkeletonTable rows={5} cols={4} /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Anomalies</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {anomalies.length} total · {anomalies.filter(a => a.status === 'open').length} open
          </p>
        </div>
        {anomalies.some(a => a.status === 'open') && (
          <button
            onClick={sendAlert}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}
          >
            Send Alerts to Slack
          </button>
        )}
      </div>

      {anomalies.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No anomalies detected"
          description="Upload cost data via POST /api/costs to start detecting anomalies."
        />
      ) : (
        <div className="space-y-4">
          {anomalies.map((a) => (
            <div key={a.id} className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full" style={{
                    backgroundColor: a.severity === 'high' ? 'var(--color-tertiary)' : a.severity === 'medium' ? 'var(--color-secondary)' : 'var(--color-primary-light)',
                    color: 'var(--bg)',
                  }}>{a.severity}</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{a.service}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.region}</span>
                </div>
                <span className="text-xs font-medium" style={{
                  color: a.status === 'open' ? 'var(--color-tertiary)' : a.status === 'acknowledged' ? 'var(--color-secondary)' : 'var(--color-primary-light)',
                }}>{a.status}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Date</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{a.date}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Expected</p>
                  <p className="text-sm font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(a.expected)}/mo</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Actual</p>
                  <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-tertiary)' }}>{formatCurrency(a.actual)}/mo</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Z-Score</p>
                  <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-tertiary)' }}>{a.z_score.toFixed(2)}</p>
                </div>
              </div>

              {a.root_cause && (
                <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-secondary)' }}>ROOT CAUSE</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a.root_cause}</p>
                </div>
              )}

              {a.status === 'open' && (
                <div className="flex gap-3">
                  <button onClick={() => updateStatus(a.id, 'acknowledged')}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
                    Acknowledge
                  </button>
                  <button onClick={() => updateStatus(a.id, 'resolved')}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnomaliesPage() {
  return (
    <ErrorBoundary>
      <AnomaliesContent />
    </ErrorBoundary>
  );
}
