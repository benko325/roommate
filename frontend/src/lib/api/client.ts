import { axiosInstance } from "@kubb/plugin-client/clients/axios";
import axios, { type AxiosRequestConfig } from "axios";
import { clearTokens, getRefreshToken, getToken, setTokens } from "@/lib/auth/token";
import { getLocale } from "@/paraglide/runtime";

// Point the Kubb-generated clients at the backend and attach the JWT.
// Imported once at app startup (main.tsx) for these side effects.
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
axiosInstance.defaults.baseURL = baseURL;

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Backend uses this for localized emails (invitations, password reset).
  config.headers["Accept-Language"] = getLocale();
  return config;
});

// De-duped access-token refresh: concurrent 401s share one refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Bare axios (no interceptors) to avoid recursion.
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
    );
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;
    const isAuthCall =
      original?.url?.includes("/auth/refresh") || original?.url?.includes("/auth/login");

    if (status === 401 && original && !original._retried && !isAuthCall && getRefreshToken()) {
      original._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return axiosInstance(original);
      }
      // Refresh failed → session is over.
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/signin")) {
        window.location.assign("/signin");
      }
    }
    return Promise.reject(error);
  },
);

export { axiosInstance };
