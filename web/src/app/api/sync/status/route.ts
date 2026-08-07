import { NextResponse } from 'next/server';
import { getSyncStatus, triggerSync } from '@/lib/worker';
import { withErrorHandling } from '@/lib/api-error';

export const GET = withErrorHandling(async () => {
  return NextResponse.json(getSyncStatus());
});

export const POST = withErrorHandling(async () => {
  triggerSync();
  return NextResponse.json({ triggered: true });
});
