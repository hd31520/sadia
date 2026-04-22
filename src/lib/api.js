const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const apiPortStart = Number(import.meta.env.VITE_API_PORT_START || 5050);
const apiPortEnd = Number(import.meta.env.VITE_API_PORT_END || 5059);
const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
const browserHostname = typeof window !== "undefined" ? window.location.hostname : "";
const browserPort = typeof window !== "undefined" ? Number(window.location.port || 0) : 0;
const isLocalBrowser =
  browserHostname === "localhost" ||
  browserHostname === "127.0.0.1" ||
  browserHostname === "https://sadia-server.vercel.app";

function createDefaultApiBases() {
  const bases = [];
  const startPort = Math.min(apiPortStart, apiPortEnd);
  const endPort = Math.max(apiPortStart, apiPortEnd);
  const browserRunsOnApiPort =
    Number.isFinite(browserPort) && browserPort >= startPort && browserPort <= endPort;

  if (!configuredApiBase && browserOrigin && (!isLocalBrowser || browserRunsOnApiPort)) {
    bases.push(browserOrigin);
  }

  if (isLocalBrowser) {
    for (let port = startPort; port <= endPort; port += 1) {
      bases.push(`http://127.0.0.1:${port}`, `http://localhost:${port}`);
    }
  }

  return bases;
}

const API_BASES = Array.from(
  new Set(
    [configuredApiBase, ...createDefaultApiBases()]
      .filter(Boolean)
      .map((base) => base.replace(/\/$/, ""))
  )
);

let activeApiBase = (API_BASES[0] || browserOrigin || "http://127.0.0.1:5050").replace(/\/$/, "");

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

async function parseJsonBody(response, fallbackMessage) {
  if (response.status === 204) {
    return null;
  }

  if (isHtmlResponse(response)) {
    throw new Error(
      `${fallbackMessage} The request reached an HTML page instead of the API. Check that the backend is running and that Vite points to the server, not the frontend.`
    );
  }

  return response.json();
}

async function requestWithBaseFallback(path, options, onNetworkErrorMessage) {
  let lastNetworkError = null;
  let sawHtmlResponse = false;

  for (const base of getCandidateBases()) {
    try {
      const response = await fetch(`${base}${path}`, options);
      if (response.status === 404) {
        continue;
      }
      if (path.startsWith("/api/") && isHtmlResponse(response)) {
        sawHtmlResponse = true;
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

  if (sawHtmlResponse) {
    throw new Error(
      `Unable to reach the API at ${getCandidateBases().join(" or ")}. A frontend HTML page responded instead of JSON.`
    );
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

  return parseJsonBody(response, "Failed to read API response.");
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

  return parseJsonBody(response, "Failed to read API response.");
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
