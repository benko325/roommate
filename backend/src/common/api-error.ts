/**
 * Response body for user-facing errors. `code` is a stable identifier the
 * frontend maps to a localized message and `params` fill its placeholders;
 * `message` stays English as the fallback for unmapped codes, tests, and
 * other API consumers.
 */
export function apiError(code: string, message: string, params?: Record<string, string | number>) {
  return { message, code, ...(params && { params }) };
}
