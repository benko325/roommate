import type { SystemRole } from '@prisma/client';

/** Shape encoded inside the signed JWT. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: SystemRole;
}

/** What `JwtStrategy.validate` attaches to the request as `req.user`. */
export interface AuthUser {
  id: string;
  email: string;
  systemRole: SystemRole;
}
