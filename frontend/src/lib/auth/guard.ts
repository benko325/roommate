import { redirect } from "@tanstack/react-router";
import { getToken } from "./token";

/** beforeLoad guard: bounce to /signin when there's no token. */
export function requireAuth() {
  if (!getToken()) throw redirect({ to: "/signin" });
}
