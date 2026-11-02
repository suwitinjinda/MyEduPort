// API URL resolution:
//   1. Explicit VITE_API_URL wins (e.g. local dev pointing elsewhere)
//   2. Production HTTPS uses same-origin → nginx proxies /api/* → backend :4000
//   3. Local HTTP dev falls back to :4000 on the same host (Vite dev convenience)
export const API_URL = (() => {
  const explicit = import.meta.env.VITE_API_URL;
  if (explicit) return explicit;
  if (typeof window !== "undefined") {
    if (window.location.protocol === "https:") return ""; // same-origin
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://localhost:4000";
})();

// Absolute URL for a stored file path like "/uploads/abc.pdf" (same resolution as the API).
// Only blog-* and email-* images are public; a student's own files need fetchFile/openFile.
export function fileUrl(path) {
  return `${API_URL}${path || ""}`;
}

const isPublicFile = (path) => /^\/uploads\/(blog|email)-/.test(path || "");

// A stored "/uploads/<name>" file, fetched with the session token → Blob
export async function fetchFile(path) {
  if (isPublicFile(path)) return (await fetch(fileUrl(path))).blob();
  const name = String(path || "").split("/").pop();
  const token = getToken();
  const response = await fetch(`${API_URL}/api/files/${encodeURIComponent(name)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error(response.status === 404 ? "File not found" : "Could not open the file");
  return response.blob();
}

// Open a stored file in a new tab (or download it if pop-ups are blocked).
// The tab is opened before the fetch so the browser still treats it as the user's click.
// Only these open in a new tab; anything else is downloaded. A blob URL runs with this site's
// origin, so an uploaded web page must never be opened as a page.
const VIEWABLE = /^(application\/pdf|image\/(png|jpeg|gif|webp)|video\/(mp4|quicktime|webm)|text\/plain)/;
export async function openFile(path, name) {
  const tab = window.open("", "_blank");
  try {
    const blob = await fetchFile(path);
    if (!VIEWABLE.test(blob.type || "")) {
      if (tab) tab.close();
      const dl = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
      const a = document.createElement("a");
      a.href = dl;
      a.download = name || String(path).split("/").pop();
      a.click();
      setTimeout(() => URL.revokeObjectURL(dl), 60_000);
      return;
    }
    const url = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (tab) { tab.location.href = url; return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = name || String(path).split("/").pop();
    a.click();
  } catch (err) {
    if (tab) tab.close();
    alert(err.message);
  }
}

// Latest saved MEPAi results → { [kind]: { [scope]: { ...payload, saved_at } } }
export async function loadSaved(kinds) {
  try { return await apiFetch(`/api/ai/saved?kinds=${encodeURIComponent(kinds.join(","))}`); } catch { return {}; }
}

export function setToken(token) {
  localStorage.setItem("myeduport_token", token);
}

export function clearToken() {
  localStorage.removeItem("myeduport_token");
}

export function getToken() {
  return localStorage.getItem("myeduport_token");
}

export function getUserRole() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role;
  } catch {
    return null;
  }
}

export async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = payload.error || "Request failed";
    // Session invalid/expired: clear the stale token and bounce to login
    // (a bad token otherwise surfaces as a confusing "Invalid token" popup).
    if (response.status === 401 && token) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-change"));
        if (!window.location.pathname.startsWith("/login")) {
          window.location.assign("/login");
        }
      }
      throw new Error("Your session expired — please sign in again.");
    }
    throw new Error(error);
  }
  return response.json();
}

export async function apiUpload(path, formData) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = payload.error || "Upload failed";
    throw new Error(error);
  }
  return response.json();
}
