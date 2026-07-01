import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Invalid email address').max(254),
  // bcrypt only hashes the first 72 bytes; cap here to avoid silent truncation.
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Profile: any subset of the editable fields.
export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email('Invalid email address').max(254),
  })
  .partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}

// Response shape (for OpenAPI docs). Dates are serialised as ISO strings.
const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  systemRole: z.enum(['ADMIN', 'USER']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userResponseSchema,
});

export class UserResponseDto extends createZodDto(userResponseSchema) {}
export class AuthResponseDto extends createZodDto(authResponseSchema) {}
