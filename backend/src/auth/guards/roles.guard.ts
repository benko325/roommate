import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SystemRole } from '@prisma/client';
import type { AuthUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Allows the request when no @Roles are set, or the user holds one of them. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    return !!user && required.includes(user.systemRole);
  }
}
