import { cookies } from 'next/headers';
import { verifyToken } from './auth';

export async function requireUser(): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('Unauthorized');

  const payload = await verifyToken(token);
  if (!payload) throw new Error('Unauthorized');
  return payload.sub;
}
