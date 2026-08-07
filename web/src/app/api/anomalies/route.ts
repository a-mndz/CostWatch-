import { NextRequest, NextResponse } from 'next/server';
import { updateAnomalyStatus } from '@/lib/db';
import { validate, AnomalyStatusSchema } from '@/lib/validation';
import { requireUser } from '@/lib/require-user';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api-error';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const rl = rateLimit('anomalies', 30, 60000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const userId = await requireUser();
  const body = await request.json();
  const v = validate(AnomalyStatusSchema, body);
  if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

  updateAnomalyStatus(userId, v.data.id, v.data.status);
  logger.info('Anomaly status updated', { userId, id: v.data.id, status: v.data.status });
  return NextResponse.json({ success: true });
});
