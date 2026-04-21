const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = configuredApiBase.replace(/\/$/, "");

const TOKEN_KEY = "pos_auth_token";
const USER_KEY = "pos_auth_user";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function parseError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function getApiBase() {
  if (API_BASE) {
    return API_BASE;
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}

async function authorizedResponse(path, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const base = getApiBase();
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      `Unable to connect to server at ${base || "the configured API base"}. Please ensure the backend is running.`
    );
  }

  if (response.status === 401 || response.status === 403) {
    clearAuthSession();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(await parseError(response, `Request failed: ${response.status}`));
  }

  return response;
}

export async function publicRequest(path, options = {}) {
  const base = getApiBase();
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Unable to connect to server at ${base || "the configured API base"}. Please ensure the backend is running.`
    );
  }

  if (!response.ok) {
    throw new Error(await parseError(response, `Request failed: ${response.status}`));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const publicPost = (path, body) =>
  publicRequest(path, { method: "POST", body: JSON.stringify(body) });

export async function apiRequest(path, options = {}) {
  const response = await authorizedResponse(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Request failed: ${response.status}`));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const apiGet = (path) => apiRequest(path);
export const apiPost = (path, body) =>
  apiRequest(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) =>
  apiRequest(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) => apiRequest(path, { method: "DELETE" });

function getFilenameFromDisposition(disposition, fallbackFilename) {
  if (!disposition) {
    return fallbackFilename;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = disposition.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] || fallbackFilename;
}

export async function apiDownload(path, fallbackFilename = "download") {
  const response = await authorizedResponse(path);
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = getFilenameFromDisposition(
    response.headers.get("content-disposition"),
    fallbackFilename
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

export function formatCurrency(value) {
  return `৳${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))}`;
}
