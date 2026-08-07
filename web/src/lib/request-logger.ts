import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

export function logRequest(
  request: NextRequest,
  response: NextResponse,
  durationMs: number,
) {
  const { method } = request;
  const url = request.nextUrl.pathname;
  const status = response.status;

  logger.info('request', {
    method,
    url,
    status,
    durationMs,
  });
}
