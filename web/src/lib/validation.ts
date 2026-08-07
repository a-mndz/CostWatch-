import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ConnectSchema = z.object({
  provider: z.enum(['aws', 'gcp']),
  label: z.string().min(1).max(100),
  accountId: z.string().min(1).max(50),
  roleArn: z.string().optional(),
  externalId: z.string().optional(),
  projectId: z.string().optional(),
  serviceAccountKey: z.string().optional(),
});

export const AnomalyStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['acknowledged', 'resolved']),
});

export const SettingsSchema = z.object({
  webhookUrl: z.string().url().optional().or(z.literal('')),
});

export const SyncSchema = z.object({
  accountId: z.number().int().positive(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map(i => i.message).join(', ') };
}
