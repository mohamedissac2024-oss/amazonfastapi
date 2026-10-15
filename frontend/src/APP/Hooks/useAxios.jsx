import { useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * The single place where the app talks to the backend.
 *
 * - Uses VITE_API_URL as the base URL (default http://localhost:8000)
 * - Adds "Authorization: Bearer <token>" when a token is stored
 * - Shows a toast on failures and resolves with { _error: true }
 */
export const BASE_URL = String(
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    let message;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      // FastAPI validation errors: [{loc, msg, ...}, ...]
      message = detail.map((item) => item.msg).join(", ");
    } else if (error.response) {
      message = `Request failed (${error.response.status})`;
    } else {
      message = "Cannot reach the API. Is the backend running on port 8000?";
    }
    toast.error(message);
    return Promise.reject(error);
  }
);

/** Turns a path returned by the API (e.g. /uploads/products/x.jpg) into a full URL. */
export function assetUrl(path) {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${BASE_URL}${path}`;
}

export default function useAxios() {
  /**
   * Runs a request and resolves with the response data,
   * or { _error: true } after showing a toast.
   */
  const request = useCallback(async (config) => {
    try {
      const { data } = await client.request(config);
      return data;
    } catch {
      return { _error: true };
    }
  }, []);

  const get = useCallback(
    (url, params) => request({ method: "GET", url, params }),
    [request]
  );
  const post = useCallback(
    (url, data) => request({ method: "POST", url, data }),
    [request]
  );
  const postForm = useCallback(
    (url, data) =>
      request({
        method: "POST",
        url,
        data,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    [request]
  );

  return { get, post, postForm, assetUrl };
}
