import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Proxy will handle the actual backend URL
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // send the httpOnly refresh cookie
});

// Attach the access token from localStorage to every request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Auto-refresh on 401 ──────────────────────────────────────────────────────
// When a request 401s (expired access token), try the refresh endpoint once,
// store the new access token, and replay the original request. De-duped so a
// burst of 401s triggers a single refresh.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes("/auth/v1/refresh");

    if (status === 401 && original && !original._retried && !isRefreshCall) {
      original._retried = true;
      try {
        refreshing =
          refreshing ||
          axios.post("/api/auth/v1/refresh", {}, { withCredentials: true });
        const { data } = await refreshing;
        refreshing = null;

        if (data?.token) {
          localStorage.setItem("token", data.token);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        }
      } catch {
        refreshing = null;
        // Refresh failed — session is gone. Clear and let the app redirect.
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
