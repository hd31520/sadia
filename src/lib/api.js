const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const apiPortStart = Number(import.meta.env.VITE_API_PORT_START || 5050);
const apiPortEnd = Number(import.meta.env.VITE_API_PORT_END || 5059);
const mode = String(import.meta.env.MODE || "").toLowerCase();
const isLocalBrowser =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/i.test(String(window.location?.hostname || ""));
const isDev =
  Boolean(import.meta.env.DEV) ||
  mode === "development" ||
  mode === "dev" ||
  isLocalBrowser;

function getBrowserOriginBase() {
  if (typeof window === "undefined") {
    return "";
  }

  const origin = String(window.location?.origin || "").trim();
  return /^https?:\/\//i.test(origin) ? origin : "";
}

function createDefaultApiBases() {
  const bases = [];
  const browserOriginBase = getBrowserOriginBase();

  if (browserOriginBase) {
    bases.push(browserOriginBase);
  }

  if (!isDev) {
    return bases;
  }

  const startPort = Math.min(apiPortStart, apiPortEnd);
  const endPort = Math.max(apiPortStart, apiPortEnd);

  for (let port = startPort; port <= endPort; port += 1) {
    bases.push(`http://127.0.0.1:${port}`, `http://localhost:${port}`);
  }

  return bases;
}

const API_BASES = Array.from(
  new Set(
    [...createDefaultApiBases(), configuredApiBase]
      .filter(Boolean)
      .map((base) => base.replace(/\/$/, ""))
  )
);

let activeApiBase = API_BASES[0] || "";

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

function getCandidateBases() {
  const normalized = Array.from(
    new Set([activeApiBase, ...API_BASES.map((base) => base.replace(/\/$/, ""))])
  );

  return normalized;
}

function isHtmlResponse(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  return contentType.includes("text/html");
}

async function requestWithBaseFallback(path, options, onNetworkErrorMessage) {
  let lastNetworkError = null;

  for (const base of getCandidateBases()) {
    try {
      const response = await fetch(`${base}${path}`, options);
      if (response.status === 404) {
        continue;
      }

      // In dev, hitting the frontend origin can return index.html for unknown /api routes.
      // Treat HTML as a wrong target so we can continue trying actual backend bases.
      if (path.startsWith("/api/") && isHtmlResponse(response)) {
        continue;
      }

      activeApiBase = base;
      return response;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (lastNetworkError) {
    throw new Error(onNetworkErrorMessage(getCandidateBases(), lastNetworkError));
  }

  return new Response(null, { status: 404, statusText: "Not Found" });
}

async function authorizedResponse(path, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  let response;
  try {
    response = await requestWithBaseFallback(
      path,
      {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      },
      (bases) =>
        `Unable to connect to server at ${bases.join(" or ")}. Please ensure the backend is running.`
    );
  } catch {
    throw new Error(
      `Unable to connect to server at ${getCandidateBases().join(" or ")}. Please ensure the backend is running.`
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
  let response;
  try {
    response = await requestWithBaseFallback(
      path,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (bases) =>
        `Unable to connect to server at ${bases.join(" or ")}. Please ensure the backend is running.`
    );
  } catch {
    throw new Error(
      `Unable to connect to server at ${getCandidateBases().join(" or ")}. Please ensure the backend is running.`
    );
  }

  if (!response.ok) {
    throw new Error(await parseError(response, `Request failed: ${response.status}`));
  }

  if (response.status === 204) {
    return null;
  }

  if (isHtmlResponse(response)) {
    throw new Error(
      `Received HTML instead of JSON from ${response.url || "the server"}. Please ensure the backend is running and API base URL is correct.`
    );
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

  if (isHtmlResponse(response)) {
    throw new Error(
      `Received HTML instead of JSON from ${response.url || "the server"}. Please ensure the backend is running and API base URL is correct.`
    );
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
