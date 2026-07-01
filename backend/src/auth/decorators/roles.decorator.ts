import { SetMetadata } from '@nestjs/common';
import type { SystemRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given system roles (used with RolesGuard). */
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
