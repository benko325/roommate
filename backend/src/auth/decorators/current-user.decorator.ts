import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../auth.types';

/** Injects the authenticated user (set by JwtStrategy) into a handler param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
