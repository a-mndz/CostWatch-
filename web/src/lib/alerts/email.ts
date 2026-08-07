import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(config: SmtpConfig) {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }
  return transporter;
}

export async function sendAlertEmail(config: SmtpConfig, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transport = getTransporter(config);
    await transport.sendMail({ from: config.from, to, subject, html });
    logger.info('Alert email sent', { to, subject });
    return true;
  } catch (err) {
    logger.error('Failed to send alert email', { error: String(err) });
    return false;
  }
}

export async function testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
    await transport.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
