import axios from "axios";

// All requests go to the same-origin Next.js proxy (/proxy/*), which forwards
// them server-side to the HTTP backend. This keeps the browser on HTTPS and
// avoids mixed-content blocking. See src/app/proxy/[...path]/route.ts.
const api = axios.create({
  baseURL: "/proxy",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
