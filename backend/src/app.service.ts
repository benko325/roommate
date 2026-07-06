import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Health/info payload for GET / (used as the deploy health check). */
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'roommate-api' };
  }
}
