import { cookies } from 'next/headers';
import { verifyAccessToken, verifyRefreshToken } from './auth';

export async function requireUser(): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('Unauthorized');

  const payload = await verifyAccessToken(token);
  if (payload) return payload.sub;

  const refreshToken = cookieStore.get('refresh_token')?.value;
  if (!refreshToken) throw new Error('Unauthorized');

  const refreshPayload = await verifyRefreshToken(refreshToken);
  if (!refreshPayload) throw new Error('Unauthorized');

  return refreshPayload.sub;
}
