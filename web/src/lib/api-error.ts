import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { randomBytes } from 'crypto';

export type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest) => {
    const requestId = randomBytes(8).toString('hex');

    try {
      const response = await handler(request);
      response.headers.set('X-Request-Id', requestId);
      return response;
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized', requestId },
          { status: 401, headers: { 'X-Request-Id': requestId } }
        );
      }

      logger.error('API error', {
        requestId,
        path: request.nextUrl.pathname,
        method: request.method,
        error: String(e),
      });

      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500, headers: { 'X-Request-Id': requestId } }
      );
    }
  };
}
