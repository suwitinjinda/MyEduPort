const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
