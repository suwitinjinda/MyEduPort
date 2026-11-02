import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch, getUserRole } from "../api/client";

// The student "Quick menu" side nav. It sits beside every page it links to (StudentShell),
// and inside the Portfolio editor's own sidebar, so moving between student pages never
// drops the menu and the student always knows where they are.

const ITEMS = [
  { to: "/profile", section: "personal", label: "Personal", Icon: ProfileIcon },
  { to: "/profile", label: "Portfolio", Icon: PortfolioIcon },
  { to: "/recommendations", label: "Universities", Icon: UniversityIcon },
  { to: "/compare", label: "Compare", Icon: CompareIcon },
  { to: "/tasks", label: "Tasks", Icon: TaskIcon, badge: "overdue" },
  { to: "/chat", label: "EduBot Chat", Icon: ChatIcon },
  { to: "/profile", section: "documents", label: "Essays", Icon: EssayIcon },
  { to: "/export", label: "Portfolio Report", Icon: ExportIcon },
  { to: "/settings", label: "Settings", Icon: SettingsIcon }
];

const wide = () => typeof window === "undefined" || !window.matchMedia || window.matchMedia("(min-width: 901px)").matches;

// Overdue-task count for the Tasks badge. The dashboard already has it and passes it in.
function useOverdue(given) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (given !== undefined) return;
    let live = true;
    apiFetch("/api/students/me/tasks")
      .then((tasks) => live && setN((tasks || []).filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()).length))
      .catch(() => {});
    return () => { live = false; };
  }, [given]);
  return given !== undefined ? given : n;
}

export function QuickMenu({ overdue, defaultOpen }) {
  const location = useLocation();
  // Open by default on desktop; on phones it starts folded so the page comes first.
  const [open, setOpen] = useState(defaultOpen !== undefined ? defaultOpen : wide());
  const overdueCount = useOverdue(overdue);
  const section = new URLSearchParams(location.search).get("section") || "";

  // Personal and Essays are sections of the Portfolio page, so "active" also checks ?section.
  const isActive = (item) => {
    if (location.pathname !== item.to) return false;
    if (item.to !== "/profile") return true;
    if (item.section) return section === item.section;
    return !ITEMS.some((i) => i.to === "/profile" && i.section && i.section === section);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "transparent", border: "none", cursor: "pointer",
          padding: "0.5rem 0.75rem", marginBottom: "0.35rem", fontFamily: "inherit",
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--ink-muted)"
        }}
      >
        <span>Quick menu</span>
        <span aria-hidden style={{ display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
      </button>
      {open && (
        <nav className="quick-menu" aria-label="Quick menu">
          {ITEMS.map((item) => (
            <NavItem
              key={item.label}
              to={item.section ? `${item.to}?section=${item.section}` : item.to}
              icon={<item.Icon />}
              label={item.label}
              active={isActive(item)}
              badge={item.badge === "overdue" ? overdueCount : 0}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

// Page frame for the student tools the Quick menu links to. Other roles (e.g. a parent on
// Settings) get the page alone.
export function StudentShell({ children }) {
  if (getUserRole() !== "student") return children;
  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <QuickMenu />
      </aside>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function NavItem({ to, icon, label, active, badge }) {
  return (
    <Link to={to} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? (
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.15rem 0.5rem",
            borderRadius: "var(--r-full)",
            background: "var(--error)",
            color: "#fff",
            minWidth: "20px",
            textAlign: "center"
          }}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/* === Sidebar SVG icons === */
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function UniversityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M5 8l3-3 3 3M19 16l-3 3-3-3"/>
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function EssayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
