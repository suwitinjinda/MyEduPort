import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { fmtDate } from "../../utils/date.js";
import { SECTIONS, sectionLabel } from "./sections.js";

// Admission Resources: the blog index. Posts are written in Admin → Blog and grouped into
// the five sections; ?section=<key> keeps the chosen tab in the address so it can be shared.

export default function BlogIndex() {
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.some((s) => s.key === params.get("section")) ? params.get("section") : "";
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setPosts(null);
    apiFetch(`/api/blog${section ? `?category=${section}` : ""}`).then((d) => setPosts(d.posts)).catch((e) => setErr(e.message));
  }, [section]);

  const choose = (key) => setParams(key ? { section: key } : {}, { replace: true });
  const current = SECTIONS.find((s) => s.key === section);

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "1.5rem", maxWidth: "780px" }}>
        <div className="eyebrow">MyEduPort</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          Admission Resources
        </h1>
        <p className="lede" style={{ marginTop: "1rem", maxWidth: "62ch" }}>
          Articles, university guides, scholarships, practice tests and eBooks to strengthen your admissions strategy.
        </p>
      </header>

      <nav className="blog-tabs" aria-label="Sections">
        <button className={!section ? "active" : ""} onClick={() => choose("")}>All</button>
        {SECTIONS.map((s) => (
          <button key={s.key} className={section === s.key ? "active" : ""} onClick={() => choose(s.key)}>{s.label}</button>
        ))}
      </nav>
      {current && <p className="muted" style={{ margin: "0 0 1.5rem", maxWidth: "70ch" }}>{current.description}</p>}

      {err ? (
        <p style={{ color: "var(--error-deep)" }}>{err}</p>
      ) : posts === null ? (
        <p className="muted">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <p className="muted" style={{ margin: 0 }}>New {current ? current.label.toLowerCase() : "posts"} are on the way — check back soon.</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.id} to={`/admission-resources/${p.slug}`} className="blog-card">
              <div className="blog-card-cover">
                {p.cover_image ? <img src={p.cover_image} alt="" loading="lazy" /> : <span>{sectionLabel(p.category)}</span>}
              </div>
              <div className="blog-card-body">
                <div className="blog-card-meta">{sectionLabel(p.category)} · {fmtDate(p.published_at)}</div>
                <h2>{p.title}</h2>
                {p.excerpt && <p>{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
