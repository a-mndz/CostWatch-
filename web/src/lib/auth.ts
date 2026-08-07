import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'costwatch-dev-secret-change-in-production');
const ALG = 'HS256';

export interface User {
  id: number;
  email: string;
  name: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: User): Promise<string> {
  return new SignJWT({ sub: String(user.id), email: user.email })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<{ sub: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { sub: Number(payload.sub), email: payload.email as string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const { getDb } = await import('./db');
  const db = getDb();
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.sub) as User | undefined;
  return user || null;
}
