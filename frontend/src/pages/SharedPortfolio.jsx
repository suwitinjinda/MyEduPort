import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000");

export default function SharedPortfolio() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/students/public/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Not found");
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
        <p className="muted">Loading shared portfolio…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
        <div className="eyebrow" style={{ paddingLeft: 0, display: "block", color: "var(--error)" }}>Link unavailable</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--ink)", marginTop: "0.75rem" }}>
          This portfolio link isn't available.
        </h1>
        <p className="muted" style={{ marginTop: "0.5rem" }}>The link may have expired or been revoked.</p>
      </div>
    );
  }

  const { profile, academics, tests, activities, awards } = data;

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Shared Portfolio · Read-only</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          {profile.name}
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem" }}>
          {profile.intended_major && <>{profile.intended_major} · </>}
          {profile.grade_level && <>{profile.grade_level} · </>}
          {profile.school || "—"}
        </p>
        {profile.share_expires_at && (
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            Link expires {new Date(profile.share_expires_at).toLocaleDateString()}
          </p>
        )}
      </header>

      <section className="grid two">
        <div className="card">
          <h2 className="section-title" style={{ fontSize: "1.25rem" }}>Profile</h2>
          <Row label="Target countries" value={profile.target_countries} />
          <Row label="Class rank" value={profile.class_rank} />
          {profile.bio && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--rule-soft)" }}>
              <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.5rem" }}>Bio</div>
              <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink-soft)", lineHeight: 1.65 }}>{profile.bio}</p>
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="section-title" style={{ fontSize: "1.25rem" }}>At a glance</h2>
          <Row label="Academic records" value={academics.length} />
          <Row label="Test scores" value={tests.length} />
          <Row label="Activities" value={activities.length} />
          <Row label="Awards" value={awards.length} />
        </div>
      </section>

      <Section title="Academics" items={academics} render={(a) => (
        <div className="flex-between">
          <div>
            <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{a.course}</strong>
            <p className="text-muted" style={{ marginTop: "0.15rem" }}>{a.year} · {a.level || "Standard"}</p>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--gold-deep)" }}>{a.grade}</span>
        </div>
      )} />

      <Section title="Test Scores" items={tests} render={(t) => (
        <div className="flex-between">
          <div>
            <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{t.test_type}</strong>
            <p className="text-muted" style={{ marginTop: "0.15rem" }}>{t.test_date ? new Date(t.test_date).toLocaleDateString() : "—"}</p>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-deep)" }}>
            {t.superscore || t.score}
          </span>
        </div>
      )} />

      <Section title="Activities" items={activities} render={(a, idx) => (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.85rem" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--gold-deep)" }}>
            {String(idx + 1).padStart(2, "0")}
          </span>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{a.title}</strong>
              {a.leadership && <span className="badge primary">Leadership</span>}
            </div>
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
              {a.role}{a.hours_per_week ? ` · ${a.hours_per_week} hrs/wk` : ""}
            </p>
            {a.description && (
              <p style={{ fontFamily: "var(--font-serif)", fontSize: "0.92rem", color: "var(--ink-soft)", marginTop: "0.5rem", lineHeight: 1.55 }}>
                {a.description}
              </p>
            )}
          </div>
        </div>
      )} />

      <Section title="Awards" items={awards} render={(a) => (
        <div>
          <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{a.title}</strong>
          {a.description && <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.4rem" }}>{a.description}</p>}
        </div>
      )} />

      <footer style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--rule)", textAlign: "center" }}>
        <p className="muted" style={{ fontStyle: "italic", fontFamily: "var(--font-serif)" }}>
          A read-only portfolio shared from MyEduPort.
        </p>
      </footer>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 0", borderBottom: "1px solid var(--rule-soft)" }}>
      <span className="muted" style={{ fontSize: "0.85rem" }}>{label}</span>
      <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{value || "—"}</strong>
    </div>
  );
}

function Section({ title, items, render }) {
  if (!items || items.length === 0) return null;
  return (
    <section style={{ marginTop: "2.5rem" }}>
      <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: "0.6rem", marginBottom: "1rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--ink)", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      <div style={{ display: "grid", gap: "0.85rem" }}>
        {items.map((item, idx) => (
          <article key={item.id || idx} className="card compact">
            {render(item, idx)}
          </article>
        ))}
      </div>
    </section>
  );
}
