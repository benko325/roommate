import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const SUPPORTED_LOCALES = ['en', 'cs', 'sk'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function resolveLocale(header: string | undefined): Locale {
  for (const part of (header ?? '').split(',')) {
    const base = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return 'en';
}

/** Best-matching app locale from the Accept-Language header; defaults to English. */
export const RequestLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Locale => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return resolveLocale(req.headers['accept-language']);
  },
);
