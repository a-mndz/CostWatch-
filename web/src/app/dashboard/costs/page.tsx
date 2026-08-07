'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBoundary } from '../../components/ErrorBoundary';

interface CostData {
  daily: Array<{ date: string; total: number }>;
  byService: Array<{ service: string; total: number }>;
  summary: { total_spend: number; days: number } | null;
}

function CostsContent() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch('/api/costs')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      const text = await file.text();
      const res = await fetch('/api/costs', { method: 'POST', body: text });
      if (res.ok) {
        const d = await res.json();
        alert(`Processed ${d.recordsProcessed} records. Found ${d.anomalies} anomalies.`);
        // Refresh data
        const fresh = await fetch('/api/costs').then(r => r.json());
        setData(fresh);
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed.');
      }
      setUploading(false);
    };
    input.click();
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-40 mb-8" />
        <Skeleton className="h-64 rounded-xl mb-8" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const daily = data?.daily ?? [];
  const byService = data?.byService ?? [];
  const maxAmount = Math.max(...daily.map(d => d.total), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Costs</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {data?.summary?.days ?? 0} days tracked · {byService.length} services
          </p>
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}
        >
          {uploading ? 'Uploading...' : 'Upload CUR CSV'}
        </button>
      </div>

      {daily.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No cost data yet"
          description="Click 'Upload CUR CSV' to import your AWS Cost & Usage Report."
          action={
            <button onClick={handleUpload}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
              Upload CSV
            </button>
          }
        />
      ) : (
        <>
          <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Daily Spend ($)</h2>
            <div className="flex items-end gap-1 h-48">
              {daily.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{
                      height: `${(d.total / maxAmount) * 100}%`,
                      backgroundColor: 'var(--color-primary)',
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-[9px] truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-medium mb-5" style={{ color: 'var(--text-secondary)' }}>By Service</h2>
            <div className="space-y-4">
              {byService.map((s) => {
                const pct = data?.summary?.total_spend ? (s.total / data.summary.total_spend * 100) : 0;
                return (
                  <div key={s.service}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.service}</span>
                      <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>${s.total.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CostsPage() {
  return (
    <ErrorBoundary>
      <CostsContent />
    </ErrorBoundary>
  );
}
