import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpenText, Briefcase, ChartLineUp, ChatsCircle, Compass, CurrencyCircleDollar, DotsThreeCircle,
  GraduationCap, House, IdentificationCard, List, Newspaper, Scales, SignOut, Sliders, Student, UsersThree, X
} from "@phosphor-icons/react";
import { clearToken } from "../api/client";

// Phone layout (Figma "Concept A — Calm Coach"): a one-row header and a bottom tab bar.
// Everything that doesn't fit in the tabs lives in the "Me" sheet. Desktop is unchanged.

export const MOBILE_QUERY = "(max-width: 768px)";
export function useIsMobile() {
  const get = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

const TABS = {
  student: [
    { to: "/dashboard", label: "Home", Icon: House },
    { to: "/profile", label: "Portfolio", Icon: IdentificationCard },
    { to: "/recommendations", label: "Universities", Icon: GraduationCap },
    { to: "/chat", label: "EduBot", Icon: ChatsCircle }
  ],
  parent: [
    { to: "/parent", label: "Home", Icon: House },
    { to: "/guide", label: "Guide", Icon: BookOpenText },
    { to: "/admission-resources", label: "Resources", Icon: Newspaper }
  ],
  counselor: [
    { to: "/counselor", label: "Students", Icon: UsersThree },
    { to: "/guide", label: "Guide", Icon: BookOpenText },
    { to: "/admission-resources", label: "Resources", Icon: Newspaper }
  ],
  affiliate: [{ to: "/affiliate", label: "Home", Icon: House }],
  admin: [{ to: "/admin", label: "Admin", Icon: Sliders }, { to: "/guide", label: "Guide", Icon: BookOpenText }],
  consult: [{ to: "/consult", label: "Home", Icon: House }, { to: "/guide", label: "Guide", Icon: BookOpenText }, { to: "/admission-resources", label: "Resources", Icon: Newspaper }]
};

const MORE = {
  student: [
    { to: "/settings", label: "Settings & privacy", Icon: Sliders },
    { to: "/my-plan", label: "My plan", Icon: CurrencyCircleDollar },
    { to: "/compare", label: "Compare universities", Icon: Scales },
    { to: "/tasks", label: "Tasks & deadlines", Icon: ChartLineUp },
    { to: "/admission-resources", label: "Resources", Icon: Newspaper },
    { to: "/career-resources", label: "Career", Icon: Briefcase },
    { to: "/guide", label: "Portfolio guide", Icon: BookOpenText },
    { to: "/pricing", label: "Pricing", Icon: CurrencyCircleDollar }
  ],
  other: [
    { to: "/settings", label: "Settings", Icon: Sliders },
    { to: "/pricing", label: "Pricing", Icon: CurrencyCircleDollar },
    { to: "/contact", label: "Contact us", Icon: ChatsCircle }
  ],
  public: [
    { to: "/", label: "Home", Icon: House },
    { to: "/why-myeduport", label: "Why MyEduPort", Icon: Student },
    { to: "/platform-overview", label: "Platform overview", Icon: Compass },
    { to: "/admission-resources", label: "Resources", Icon: Newspaper },
    { to: "/career-resources", label: "Career", Icon: Briefcase },
    { to: "/guide", label: "Portfolio guide", Icon: BookOpenText },
    { to: "/pricing", label: "Pricing", Icon: CurrencyCircleDollar }
  ]
};

function Sheet({ title, items, onClose, signedIn }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const signOut = () => { clearToken(); window.dispatchEvent(new Event("auth-change")); onClose(); navigate("/login"); };
  return (
    <div className="mnav-overlay" onClick={onClose}>
      <div className="mnav-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="mnav-sheet-head">
          <strong>{title}</strong>
          <button type="button" className="mnav-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <nav className="mnav-list">
          {items.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={onClose}><Icon size={22} weight="duotone" aria-hidden="true" /> {label}</NavLink>
          ))}
          {signedIn ? (
            <button type="button" className="mnav-signout" onClick={signOut}><SignOut size={22} weight="duotone" aria-hidden="true" /> Sign out</button>
          ) : (
            <NavLink to="/login?mode=register" onClick={onClose} className="button" style={{ marginTop: "0.75rem", justifyContent: "center" }}>Create your free profile</NavLink>
          )}
        </nav>
      </div>
    </div>
  );
}

// Bottom tab bar for signed-in users
export function MobileTabBar({ role }) {
  const [more, setMore] = useState(false);
  const location = useLocation();
  useEffect(() => setMore(false), [location.pathname]);
  const tabs = TABS[role] || TABS.student;
  const moreItems = role === "student" || !role ? MORE.student : MORE.other;
  return (
    <>
      <nav className="mnav-tabbar" aria-label="Main">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mnav-tab${isActive ? " on" : ""}`}>
            {({ isActive }) => <><span className="mnav-ic"><Icon size={22} weight={isActive ? "fill" : "regular"} aria-hidden="true" /></span>{label}</>}
          </NavLink>
        ))}
        <button type="button" className={`mnav-tab${more ? " on" : ""}`} aria-expanded={more} onClick={() => setMore(true)}>
          <span className="mnav-ic"><DotsThreeCircle size={22} weight={more ? "fill" : "regular"} aria-hidden="true" /></span>Me
        </button>
      </nav>
      {more && <Sheet title="Menu" items={moreItems} onClose={() => setMore(false)} signedIn />}
    </>
  );
}

// ☰ for visitors who aren't signed in (no tab bar)
export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <>
      <button type="button" className="mnav-burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><List size={24} /></button>
      {open && <Sheet title="Menu" items={MORE.public} onClose={() => setOpen(false)} signedIn={false} />}
    </>
  );
}
