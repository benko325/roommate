import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authControllerLogout } from "@/lib/api/generated/clients";
import { authControllerMeQueryKey, useAuthControllerMe } from "@/lib/api/generated/hooks";
import type { AuthResponseDto } from "@/lib/api/generated/types";
import { clearTokens, getRefreshToken, getToken, setTokens } from "./token";

/** Current auth state, backed by the /me query (only runs when a token exists). */
export function useAuth() {
  const hasToken = !!getToken();
  const query = useAuthControllerMe({
    query: { enabled: hasToken, retry: false, staleTime: 60_000 },
  });
  return {
    user: query.data,
    isLoading: hasToken && query.isLoading,
    isAuthenticated: !!query.data,
  };
}

/** Persist a login/register result and prime the /me cache. */
export function useSaveSession() {
  const queryClient = useQueryClient();
  return (res: AuthResponseDto) => {
    setTokens(res.accessToken, res.refreshToken);
    queryClient.setQueryData(authControllerMeQueryKey(), res.user);
  };
}

/** Revoke the refresh token, clear the session, and return to the landing page. */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // Best-effort revoke; ignore failures.
      await authControllerLogout({ refreshToken }).catch(() => {});
    }
    clearTokens();
    queryClient.clear();
    await navigate({ to: "/" });
  };
}
