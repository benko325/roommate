import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.schema';

/**
 * Sends transactional email via SMTP when configured (SMTP_HOST set); otherwise
 * logs the message so development works with zero setup. Delivery is
 * fire-and-forget: a mail failure never breaks the triggering request.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) {
      this.logger.warn('SMTP_HOST not set — emails will be logged, not sent.');
      return;
    }
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASS', { infer: true });
    this.transporter = createTransport({
      host,
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: this.config.get('SMTP_SECURE', { infer: true }),
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  sendInvitation(email: string, unitName: string, token: string): void {
    const url = `${this.config.get('FRONTEND_URL', { infer: true })}/invite/${token}`;
    const subject = `You're invited to join "${unitName}" on RoomMate`;
    const text = `You've been invited to join "${unitName}" on RoomMate.\n\nAccept your invitation: ${url}`;
    const html = `
      <p>You've been invited to join <strong>${unitName}</strong> on RoomMate.</p>
      <p><a href="${url}">Accept your invitation</a></p>
      <p style="color:#6f655c">Or paste this link into your browser:<br>${url}</p>`;

    void this.deliver({ to: email, subject, text, html }, url);
  }

  private async deliver(
    message: { to: string; subject: string; text: string; html: string },
    linkForLog: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[email:log] To ${message.to} — ${message.subject}: ${linkForLog}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM', { infer: true }),
        ...message,
      });
      this.logger.log(`Sent "${message.subject}" to ${message.to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${message.to}`, err as Error);
    }
  }
}
