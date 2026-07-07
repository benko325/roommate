import { m } from "@/paraglide/messages";

type ApiErrorBody = {
  message?: string | string[];
  code?: string;
  params?: Record<string, string | number>;
};

type Params = Record<string, string | number>;

const str = (v: unknown) => String(v ?? "");
const num = (v: unknown) => Number(v ?? 0);

const INVITE_STATUS: Record<string, () => string> = {
  ACCEPTED: m.invitation_status_accepted,
  REJECTED: m.invitation_status_rejected,
  EXPIRED: m.invitation_status_expired,
};

// Localized message per backend error code (see backend apiError call sites).
// Codes that duplicate an existing frontend message reuse that key.
const API_MESSAGES: Record<string, (p: Params) => string> = {
  unit_not_found: () => m.api_unit_not_found(),
  owner_only: () => m.api_owner_only(),
  not_a_member: () => m.api_not_a_member(),
  email_registered: () => m.register_error_conflict(),
  invalid_credentials: () => m.signin_error_invalid(),
  reset_link_invalid: () => m.reset_error_toast(),
  current_password_incorrect: () => m.password_current_incorrect(),
  email_in_use: () => m.profile_email_conflict(),
  user_not_found: () => m.api_user_not_found(),
  room_not_found: () => m.api_room_not_found(),
  reservation_not_found: () => m.api_reservation_not_found(),
  not_own_reservation: () => m.api_not_own_reservation(),
  reservation_cancelled: () => m.api_reservation_cancelled(),
  end_not_after_start: () => m.api_end_not_after_start(),
  multi_day_reservation: () => m.api_multi_day_reservation(),
  room_available_from: (p) => m.api_room_available_from({ time: str(p.time) }),
  room_available_until: (p) => m.api_room_available_until({ time: str(p.time) }),
  reservation_too_long: (p) => m.api_reservation_too_long({ hours: num(p.hours) }),
  slot_overlap: () => m.api_slot_overlap(),
  max_per_day: (p) => m.api_max_per_day({ count: num(p.count) }),
  min_gap: (p) => m.api_min_gap({ minutes: num(p.minutes) }),
  cannot_remove_own_admin: () => m.api_cannot_remove_own_admin(),
  cannot_delete_self: () => m.api_cannot_delete_self(),
  user_owns_units: () => m.api_user_owns_units(),
  available_range_invalid: () => m.api_available_range_invalid(),
  issue_room_not_in_unit: () => m.api_issue_room_not_in_unit(),
  issue_reservation_not_yours: () => m.api_issue_reservation_not_yours(),
  issue_reservation_room_mismatch: () => m.api_issue_reservation_room_mismatch(),
  issue_not_found: () => m.api_issue_not_found(),
  issue_already_resolved: () => m.api_issue_already_resolved(),
  invite_own_unit: () => m.api_invite_own_unit(),
  invite_already_member: () => m.api_invite_already_member(),
  invite_pending_exists: () => m.api_invite_pending_exists(),
  invitation_not_found: () => m.api_invitation_not_found(),
  member_not_found: () => m.api_member_not_found(),
  invite_wrong_email: () => m.api_invite_wrong_email(),
  invite_already_responded: (p) =>
    m.api_invite_already_responded({
      status: (INVITE_STATUS[str(p.status)] ?? (() => str(p.status).toLowerCase()))(),
    }),
};

/**
 * Localized message for an API error. Known `code`s are translated with their
 * `params`; anything else falls back to the backend's (English) message so
 * new or unmapped errors still surface something useful.
 */
export function apiErrorMessage(err: unknown): string | undefined {
  const data = (err as { response?: { data?: ApiErrorBody } })?.response?.data;
  if (!data) return undefined;
  const translate = data.code ? API_MESSAGES[data.code] : undefined;
  if (translate) return translate(data.params ?? {});
  return Array.isArray(data.message) ? data.message[0] : data.message;
}
