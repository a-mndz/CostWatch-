import { NextResponse } from 'next/server';
import { getSyncStatus, triggerSync } from '@/lib/worker';

export async function GET() {
  return NextResponse.json(getSyncStatus());
}

export async function POST() {
  triggerSync();
  return NextResponse.json({ triggered: true });
}
