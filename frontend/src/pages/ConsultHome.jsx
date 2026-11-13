import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Icon } from "../components/marketing.jsx";

// Landing page for the "consult" role. The consultant workspace is being designed; until
// then consultants can read the same guides and resources as everyone else.
export default function ConsultHome() {
  const [me, setMe] = useState(null);
  useEffect(() => { apiFetch("/api/auth/me").then(setMe).catch(() => {}); }, []);
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="eyebrow">Consultant</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.1rem", color: "var(--ink)", letterSpacing: "-0.02em", margin: "0.2rem 0 0" }}>Welcome{me?.name ? `, ${me.name.split(" ")[0]}` : ""}.</h1>
        <p className="lede" style={{ marginTop: "0.5rem" }}>Your consultant workspace is being prepared. We'll let you know as soon as it's ready.</p>
      </header>
      <div className="mk-features">
        {[["map", "Portfolio guide", "How top universities read an application.", "/guide"], ["portfolio", "Admission resources", "Articles and university guides.", "/admission-resources"], ["school", "Career resources", "Careers, majors and pathways.", "/career-resources"]].map(([ic, t, d, to]) => (
          <Link key={to} to={to} className="mk-feature" style={{ textDecoration: "none" }}>
            <span className="mk-icon"><Icon name={ic} size={26} /></span>
            <h3>{t}</h3><p>{d}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
