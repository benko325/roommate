import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

/**
 * Dev-only mail stub: logs the message instead of sending. Swap the body of
 * `send` for a real transport (Nodemailer/Resend/etc.) in production.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  sendInvitation(email: string, unitName: string, token: string): void {
    const url = `${this.config.get('FRONTEND_URL', { infer: true })}/invite/${token}`;
    this.logger.log(
      `Invitation for ${email} to join "${unitName}": ${url}`,
    );
  }
}
