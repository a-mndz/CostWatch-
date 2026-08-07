import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: 'unknown',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    health.db = 'connected';
  } catch {
    health.db = 'error';
    health.status = 'degraded';
  }

  const status = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status });
}
