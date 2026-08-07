'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Skeleton, SkeletonCards, SkeletonTable } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface CostData {
  daily: Array<{ date: string; total: number }>;
  byService: Array<{ service: string; total: number }>;
  summary: { total_spend: number; days: number; first_date: string; last_date: string } | null;
  openAnomalies: number;
  anomalies: Array<{
    id: number; date: string; service: string; expected: number;
    actual: number; z_score: number; severity: string; status: string;
  }>;
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function DashboardContent() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/costs')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <SkeletonCards />
        <div className="mt-8">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <SkeletonTable rows={3} cols={7} />
          </div>
        </div>
      </div>
    );
  }

  const openCount = data?.openAnomalies ?? 0;
  const totalSpend = data?.summary?.total_spend ?? 0;
  const resolvedCount = (data?.anomalies?.filter(a => a.status !== 'open').length) ?? 0;
  const alertsSent = data?.anomalies?.length ?? 0;
  const anomalies = data?.anomalies?.slice(0, 5) ?? [];

  const summaryCards = [
    { label: 'Monthly Spend', value: formatCurrency(totalSpend), change: `${data?.summary?.days ?? 0} days tracked`, color: 'var(--color-primary)', href: '/dashboard/costs' },
    { label: 'Active Anomalies', value: String(openCount), change: openCount > 0 ? 'needs attention' : 'all clear', color: 'var(--color-tertiary)', href: '/dashboard/anomalies' },
    { label: 'Alerts Sent', value: String(alertsSent), change: 'this period', color: 'var(--color-secondary)', href: '/dashboard/alerts' },
    { label: 'Resolved', value: String(resolvedCount), change: 'anomalies closed', color: 'var(--color-primary-light)', href: '/dashboard/anomalies' },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
          {data?.summary?.last_date ? `Last data: ${data.summary.last_date}` : 'No data yet'}
        </p>
        <div className="flex items-end gap-4">
          <h1 className="text-4xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {openCount}
          </h1>
          <div className="pb-1">
            <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              open anomal{openCount === 1 ? 'y' : 'ies'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {resolvedCount} resolved this period
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Anomalies</h2>
        <Link href="/dashboard/anomalies" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
          View all →
        </Link>
      </div>

      <div
        className="rounded-xl overflow-hidden mb-8"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Service', 'Date', 'Expected', 'Actual', 'Change', 'Severity', 'Status'].map((h) => (
                <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="✓"
                    title="No anomalies detected"
                    description="Upload cost data via POST /api/costs to start detecting anomalies."
                  />
                </td>
              </tr>
            ) : (
              anomalies.map((a) => (
                <tr key={a.id} tabIndex={0} role="row" className="outline-none focus-visible:ring-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{a.service}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{a.date}</td>
                  <td className="px-5 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(a.expected)}</td>
                  <td className="px-5 py-3 font-mono font-medium" style={{ color: 'var(--color-tertiary)' }}>{formatCurrency(a.actual)}</td>
                  <td className="px-5 py-3 font-mono font-medium" style={{ color: 'var(--color-tertiary)' }}>
                    {a.expected > 0 ? `+${((a.actual - a.expected) / a.expected * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full" style={{
                      backgroundColor: a.severity === 'high' ? 'var(--color-tertiary)' : a.severity === 'medium' ? 'var(--color-secondary)' : 'var(--color-primary-light)',
                      color: 'var(--bg)',
                    }}>{a.severity}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium" style={{
                      color: a.status === 'open' ? 'var(--color-tertiary)' : a.status === 'acknowledged' ? 'var(--color-secondary)' : 'var(--color-primary-light)',
                    }}>{a.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>This Period</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl p-4 transition-colors duration-150 hover:opacity-90"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            <p className="text-xs mt-1" style={{ color: card.color }}>{card.change}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
