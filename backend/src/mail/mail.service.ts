import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Locale } from '../common/request-locale.decorator';
import type { Env } from '../config/env.schema';

// Email copy per locale. The invitation goes out in the inviter's language
// (housemates usually share one); the reset email in the requester's.
const MAIL_TEXTS = {
  en: {
    inviteSubject: (unitName: string) => `You're invited to join "${unitName}" on RoomMate`,
    inviteBody: (unitName: string) => `You've been invited to join "${unitName}" on RoomMate.`,
    inviteAction: 'Accept your invitation',
    resetSubject: 'Reset your RoomMate password',
    resetBody: 'We received a request to reset your RoomMate password.',
    resetAction: 'Choose a new password',
    resetIgnore: "If you didn't request this, you can ignore this email.",
    linkFallback: 'Or paste this link into your browser:',
  },
  cs: {
    inviteSubject: (unitName: string) => `Pozvánka do domácnosti „${unitName}“ na RoomMate`,
    inviteBody: (unitName: string) => `Byli jste pozváni do domácnosti „${unitName}“ na RoomMate.`,
    inviteAction: 'Přijmout pozvánku',
    resetSubject: 'Obnovení hesla na RoomMate',
    resetBody: 'Obdrželi jsme žádost o obnovení vašeho hesla na RoomMate.',
    resetAction: 'Zvolit nové heslo',
    resetIgnore: 'Pokud jste o to nežádali, tento e-mail můžete ignorovat.',
    linkFallback: 'Nebo vložte tento odkaz do prohlížeče:',
  },
  sk: {
    inviteSubject: (unitName: string) => `Pozvánka do domácnosti „${unitName}“ na RoomMate`,
    inviteBody: (unitName: string) => `Boli ste pozvaní do domácnosti „${unitName}“ na RoomMate.`,
    inviteAction: 'Prijať pozvánku',
    resetSubject: 'Obnovenie hesla na RoomMate',
    resetBody: 'Dostali sme žiadosť o obnovenie vášho hesla na RoomMate.',
    resetAction: 'Zvoliť nové heslo',
    resetIgnore: 'Ak ste o to nežiadali, tento e-mail môžete ignorovať.',
    linkFallback: 'Alebo vložte tento odkaz do prehliadača:',
  },
} as const;

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

  sendInvitation(email: string, unitName: string, token: string, locale: Locale = 'en'): void {
    const t = MAIL_TEXTS[locale];
    const url = `${this.config.get('FRONTEND_URL', { infer: true })}/invite/${token}`;
    const subject = t.inviteSubject(unitName);
    const text = `${t.inviteBody(unitName)}\n\n${t.inviteAction}: ${url}`;
    const html = `
      <p>${t.inviteBody(unitName)}</p>
      <p><a href="${url}">${t.inviteAction}</a></p>
      <p style="color:#6f655c">${t.linkFallback}<br>${url}</p>`;

    void this.deliver({ to: email, subject, text, html }, url);
  }

  sendPasswordReset(email: string, token: string, locale: Locale = 'en'): void {
    const t = MAIL_TEXTS[locale];
    const url = `${this.config.get('FRONTEND_URL', { infer: true })}/reset-password/${token}`;
    const subject = t.resetSubject;
    const text = `${t.resetSubject}: ${url}\n\n${t.resetIgnore}`;
    const html = `
      <p>${t.resetBody}</p>
      <p><a href="${url}">${t.resetAction}</a></p>
      <p style="color:#6f655c">${t.linkFallback}<br>${url}</p>
      <p style="color:#6f655c">${t.resetIgnore}</p>`;

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
