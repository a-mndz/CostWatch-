'use client';

import { useState, useEffect } from 'react';
import { SkeletonTable } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBoundary } from '../../components/ErrorBoundary';

interface Alert {
  id: number; date: string; service: string; severity: string;
  expected: number; actual: number; z_score: number;
  channel: string; sent_at: string; delivery_status: string;
}

function AlertsContent() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => { setAlerts(d.alerts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div><SkeletonTable rows={5} cols={7} /></div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Alert History</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {alerts.length} alerts sent
        </p>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No alerts sent yet"
          description="Alerts appear here when anomalies are detected and sent to Slack."
        />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Service', 'Severity', 'Expected', 'Actual', 'Channel', 'Sent', 'Status'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{a.service}</td>
                  <td className="px-5 py-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full" style={{
                      backgroundColor: a.severity === 'high' ? 'var(--color-tertiary)' : a.severity === 'medium' ? 'var(--color-secondary)' : 'var(--color-primary-light)',
                      color: 'var(--bg)',
                    }}>{a.severity}</span>
                  </td>
                  <td className="px-5 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>${a.expected.toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono font-medium" style={{ color: 'var(--color-tertiary)' }}>${a.actual.toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{a.channel}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{new Date(a.sent_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-primary-light)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-primary-light)' }} />
                      {a.delivery_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <ErrorBoundary>
      <AlertsContent />
    </ErrorBoundary>
  );
}
