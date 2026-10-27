import { apiFetch } from "../api/client";

// Referral codes arrive as ?ref=CODE on any page (home, a campaign page, pricing…).
// The code is kept for 30 days so someone who clicks today and signs up next week is still
// credited to whoever sent them. First touch wins: a later link doesn't replace an earlier
// one, which stops codes being swapped in at the last moment.

const KEY = "mep-ref";
const WINDOW_MS = 30 * 86400000;

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v?.code || !v?.at || Date.now() - v.at > WINDOW_MS) return null;
    return v;
  } catch { return null; }
}

// The stored code and what it gives (discount, who it's from), or null
export function storedReferral() {
  return read();
}

export function clearReferral() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

// Call on navigation. Records the visit and remembers a valid code.
export async function captureReferral(search, path) {
  let code = null;
  try { code = new URLSearchParams(search || "").get("ref"); } catch { /* malformed URL */ }
  if (!code) return read();
  code = code.trim();
  if (!code) return read();

  const existing = read();
  try {
    const info = await apiFetch("/api/ref/visit", { method: "POST", body: JSON.stringify({ code, path }) });
    if (!info?.valid) return existing;
    if (existing && existing.code !== info.code) return existing; // first touch wins
    const next = { code: info.code, at: existing?.at || Date.now(), from: info.from, kind: info.kind, discount_percent: info.discount_percent, discount_duration: info.discount_duration, discount_months: info.discount_months };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  } catch {
    return existing;
  }
}
