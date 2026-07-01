import { axiosInstance } from "@kubb/plugin-client/clients/axios";
import { getToken } from "@/lib/auth/token";

// Point the Kubb-generated clients at the backend and attach the JWT.
// Imported once at app startup (main.tsx) for these side effects.
axiosInstance.defaults.baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { axiosInstance };
