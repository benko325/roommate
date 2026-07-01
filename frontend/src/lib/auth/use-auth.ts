import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authControllerMeQueryKey, useAuthControllerMe } from "@/lib/api/generated/hooks";
import type { AuthResponseDto } from "@/lib/api/generated/types";
import { clearToken, getToken, setToken } from "./token";

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
    setToken(res.accessToken);
    queryClient.setQueryData(authControllerMeQueryKey(), res.user);
  };
}

/** Clear the session and return to the landing page. */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    clearToken();
    queryClient.clear();
    await navigate({ to: "/" });
  };
}
