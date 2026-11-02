import { useEffect, useState } from "react";

// Which student menu to show: "classic" (Quick menu + Portfolio's own Sections menu, the
// design before 02/11/2026) or "unified" (one side menu on every page, Portfolio sections
// nested inside). Both are live so customers can try the new one and switch back. The choice
// is kept per browser; DEFAULT is what everyone starts on.
const KEY = "mep-nav-layout";
export const NAV_DEFAULT = "classic";

export function getNavLayout() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "unified" || v === "classic" ? v : NAV_DEFAULT;
  } catch { return NAV_DEFAULT; }
}

export function setNavLayout(v) {
  try { localStorage.setItem(KEY, v); } catch { /* storage unavailable — this page only */ }
  window.dispatchEvent(new CustomEvent("nav-layout", { detail: v }));
}

export function useNavLayout() {
  const [layout, setLayout] = useState(getNavLayout);
  useEffect(() => {
    const on = () => setLayout(getNavLayout());
    window.addEventListener("nav-layout", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("nav-layout", on); window.removeEventListener("storage", on); };
  }, []);
  return layout;
}
