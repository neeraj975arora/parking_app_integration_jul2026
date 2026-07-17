import axios from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "../utils/constants";
// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});
// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        // Attach request start time for duration tracking
        config.metadata = { startTime: new Date() };
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Trace outgoing request
        try {
            const method = (config.method || "GET").toUpperCase();
            const baseURL = config.baseURL || "";
            const urlPath = config.url || "";
            let fullUrl;
            try {
                fullUrl = baseURL ? new URL(urlPath, baseURL).toString() : urlPath;
            } catch (e) {
                fullUrl = `${baseURL}${urlPath}`;
            }
            console.groupCollapsed(`[API Request] ${method} ${fullUrl}`);
            console.log("URL:", fullUrl);
            console.log("Method:", method);
            console.log("Base URL:", baseURL);
            if (config.headers) console.log("Headers:", config.headers);
            if (config.params) console.log("Params:", config.params);
            if (config.data) console.log("Data:", config.data);
            console.groupEnd();
        } catch (_) {
            // Swallow logging errors to avoid impacting functionality
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
// Enhanced response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        // Trace successful response
        try {
            const config = response.config || {};
            const method = (config.method || "GET").toUpperCase();
            const baseURL = config.baseURL || "";
            const urlPath = config.url || "";
            let fullUrl;
            try {
                fullUrl = baseURL ? new URL(urlPath, baseURL).toString() : urlPath;
            } catch (e) {
                fullUrl = `${baseURL}${urlPath}`;
            }
            const start = config.metadata?.startTime
                ? new Date(config.metadata.startTime).getTime()
                : undefined;
            const durationMs = typeof start === "number" ? Date.now() - start : undefined;
            console.groupCollapsed(
                `[API Response] ${response.status} ${method} ${fullUrl}` +
                (durationMs !== undefined ? ` (${durationMs}ms)` : "")
            );
            console.log("Status:", response.status, response.statusText);
            console.log("URL:", fullUrl);
            if (response.headers) console.log("Headers:", response.headers);
            if (response.data !== undefined) console.log("Data:", response.data);
            if (durationMs !== undefined) console.log("Duration (ms):", durationMs);
            console.groupEnd();
        } catch (_) {
            // Swallow logging errors to avoid impacting functionality
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        // Trace error response/network error
        try {
            const cfg = error.config || error.response?.config || {};
            const method = (cfg.method || "GET").toUpperCase();
            const baseURL = cfg.baseURL || "";
            const urlPath = cfg.url || "";
            let fullUrl;
            try {
                fullUrl = baseURL ? new URL(urlPath, baseURL).toString() : urlPath;
            } catch (e) {
                fullUrl = `${baseURL}${urlPath}`;
            }
            const start = cfg.metadata?.startTime
                ? new Date(cfg.metadata.startTime).getTime()
                : undefined;
            const durationMs = typeof start === "number" ? Date.now() - start : undefined;
            if (error.response) {
                console.groupCollapsed(
                    `[API Error] ${error.response.status} ${method} ${fullUrl}` +
                    (durationMs !== undefined ? ` (${durationMs}ms)` : "")
                );
                console.log("Status:", error.response.status, error.response.statusText);
                console.log("URL:", fullUrl);
                if (error.response.headers) console.log("Headers:", error.response.headers);
                if (error.response.data !== undefined)
                    console.log("Data:", error.response.data);
                if (durationMs !== undefined) console.log("Duration (ms):", durationMs);
                console.groupEnd();
            } else if (error.request) {
                console.groupCollapsed(`[API Error] NETWORK ${method} ${fullUrl}`);
                console.log("URL:", fullUrl);
                console.log("Network error: No response received");
                console.groupEnd();
            } else {
                console.groupCollapsed(`[API Error] ${method} ${fullUrl || ""}`);
                console.log("Error:", error.message);
                console.groupEnd();
            }
        } catch (_) {
            // Swallow logging errors to avoid impacting functionality
        }
        // Handle common errors
        if (error.response) {
            const { status, data } = error.response;
            switch (status) {
                case 401:
                    // Unauthorized - clear auth data and redirect to login
                    if (!originalRequest._retry) {
                        console.warn("Authentication failed - redirecting to login");
                        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
                        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
                        // Avoid redirect loops
                        if (window.location.pathname !== "/login") {
                            window.location.href = "/login";
                        }
                    }
                    break;
                case 403:
                    // Forbidden - insufficient permissions
                    console.error("Access denied: Insufficient permissions");
                    error.userMessage =
                        "You do not have permission to access this resource.";
                    break;
                case 404:
                    // Not found
                    console.error("Resource not found");
                    error.userMessage = "The requested resource was not found.";
                    break;
                case 422:
                    // Validation error
                    console.error("Validation error:", data);
                    error.userMessage =
                        data?.message || "Please check your input and try again.";
                    break;
                case 429:
                    // Rate limiting
                    console.error("Rate limit exceeded");
                    error.userMessage =
                        "Too many requests. Please wait a moment and try again.";
                    break;
                case 500:
                    // Server error
                    console.error("Server error occurred");
                    error.userMessage =
                        "A server error occurred. Please try again later.";
                    break;
                case 502:
                case 503:
                case 504:
                    // Service unavailable
                    console.error("Service unavailable");
                    error.userMessage =
                        "The service is temporarily unavailable. Please try again later.";
                    break;
                default:
                    console.error("API Error:", data?.message || error.message);
                    error.userMessage = data?.message || "An unexpected error occurred.";
            }
        } else if (error.request) {
            // Network error
            console.error("Network error: Please check your connection");
            error.userMessage =
                "Network error. Please check your internet connection and try again.";
            // Implement retry logic for network errors
            if (!originalRequest._retry && shouldRetry(error)) {
                originalRequest._retry = true;
                originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
                if (originalRequest._retryCount <= 3) {
                    const delay = Math.pow(2, originalRequest._retryCount) * 1000; // Exponential backoff
                    console.log(
                        `Retrying request in ${delay}ms (attempt ${originalRequest._retryCount})`
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    return api(originalRequest);
                }
            }
        } else {
            // Other error
            console.error("Error:", error.message);
            error.userMessage = "An unexpected error occurred.";
        }
        return Promise.reject(error);
    }
);
// Helper function to determine if request should be retried
const shouldRetry = (error) => {
    // Retry on network errors and specific HTTP status codes
    return (
        !error.response ||
        error.response.status >= 500 ||
        error.response.status === 429
    );
};
export default api;