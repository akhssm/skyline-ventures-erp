import axios from "axios";

/**
 * In development Vite proxies /api to the local server, so the default base is
 * a relative path. Set VITE_API_URL when the API lives on another origin.
 *
 * The suffix is added here rather than demanded of whoever sets the variable,
 * because "https://host" and "https://host/api" are both the obvious thing to
 * paste into a hosting dashboard and only one of them used to work.
 */
const resolveBaseUrl = () => {
    const configured = (import.meta.env.VITE_API_URL || "").trim();

    if (!configured) return "/api";

    const trimmed = configured.replace(/\/+$/, "");

    return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const baseURL = resolveBaseUrl();

export const TOKEN_KEY = "sb.token";

/* A free hosting tier stops the API after a spell of no traffic, and the next
   request pays for the restart. Sixty seconds covers that cold start; a normal
   response still arrives in well under a second. */
const api = axios.create({
    baseURL,
    timeout: 60000,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Listeners registered here are told when a request comes back 401, which is
// how AuthContext knows to drop the session.
const unauthorizedHandlers = new Set();

export const onUnauthorized = (handler) => {
    unauthorizedHandlers.add(handler);
    return () => unauthorizedHandlers.delete(handler);
};

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error.response?.status;

        // The sign-in calls report their own errors; a 401 there is a wrong
        // OTP, not an expired session.
        const isAuthCall = (error.config?.url || "").includes("/auth/");

        if (status === 401 && !isAuthCall) {
            unauthorizedHandlers.forEach((handler) => handler());
        }

        const message =
            error.response?.data?.message ||
            (error.code === "ECONNABORTED"
                ? "The server took too long to answer. It may be waking up, so please try again."
                : error.request && !error.response
                  ? "Cannot reach the server. Check that the API is running."
                  : "Something went wrong. Please try again.");

        return Promise.reject(Object.assign(new Error(message), { status }));
    }
);

export default api;
