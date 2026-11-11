import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

// Company details an admin fills in under Admin → Consents → Company details.
// Fetched once per page load and shared; empty fields are shown as highlighted placeholders.
let cache = null;
let inflight = null;

export function refreshLegalInfo() {
  inflight = apiFetch("/api/consent/legal").then((v) => (cache = v)).catch(() => (cache = cache || {}));
  return inflight;
}

export function useLegalInfo() {
  const [info, setInfo] = useState(cache || {});
  useEffect(() => {
    if (cache) return;
    (inflight || refreshLegalInfo()).then((v) => setInfo(v || {}));
  }, []);
  return info;
}
