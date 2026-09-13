import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";
import Skeleton, { EmptyState } from "../components/Skeleton.jsx";

const FLAG = { US: "🇺🇸", UK: "🇬🇧", China: "🇨🇳", Canada: "🇨🇦", Australia: "🇦🇺", Japan: "🇯🇵", Germany: "🇩🇪", Singapore: "🇸🇬", "Hong Kong": "🇭🇰" };

export default function Recommendations() {
  const [form, setForm] = useState({ country: "All", major: "", gpa: "3.7" });
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("country");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadRecommendations(); }, []);

  const updateField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/ai/recommendations", { method: "POST", body: JSON.stringify({ ...form, sortBy }) });
      setResults(data.results || []);
      setStatus("");
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    if (results.length > 0) loadRecommendations();
  };

  const reach = results.filter((r) => r.category === "Reach");
  const target = results.filter((r) => r.category === "Target");
  const safety = results.filter((r) => r.category === "Safety");

  return (
    <div>
      {/* Header banner */}
      <div
        style={{
          background: "var(--grad)",
          color: "#fff",
          padding: "1.5rem 2rem",
          borderRadius: "var(--r-lg) var(--r-lg) 0 0",
          fontSize: "1.1rem",
          fontWeight: 700,
          letterSpacing: "-0.01em"
        }}
      >
        AI University Recommendations
      </div>

      <div
        className="card"
        style={{ borderRadius: "0 0 var(--r-lg) var(--r-lg)", padding: "2rem", borderTop: "none", marginBottom: "2rem" }}
      >
        <h1 className="section-title" style={{ fontSize: "1.75rem", marginBottom: "1.5rem" }}>
          Your University Recommendations
        </h1>

        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1.5rem" }}>
          <div className="input" style={{ marginBottom: 0, minWidth: "160px" }}>
            <label>Sort by:</label>
            <select value={sortBy} onChange={handleSortChange}>
              <option value="country">Country</option>
              <option value="match">Match %</option>
              <option value="name">Name</option>
            </select>
          </div>
          <span style={{ paddingBottom: "0.65rem", color: "var(--ink-muted)" }}>—</span>
          <div className="input" style={{ marginBottom: 0, minWidth: "160px" }}>
            <label>Country:</label>
            <select value={form.country} onChange={updateField("country")}>
              <option value="All">All Countries</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="China">China</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
            </select>
          </div>
          <div className="input" style={{ marginBottom: 0, minWidth: "180px" }}>
            <label>Major:</label>
            <select value={form.major} onChange={updateField("major")}>
              <option value="">All Majors</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Engineering">Engineering</option>
              <option value="Business">Business</option>
              <option value="Medicine">Medicine</option>
              <option value="Economics">Economics</option>
            </select>
          </div>
          <button className="button" onClick={loadRecommendations} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Three columns */}
        {loading && results.length === 0 ? (
          <Skeleton lines={8} />
        ) : results.length === 0 ? (
          <EmptyState
            title="No university matches yet."
            hint="Click below to generate AI-curated recommendations based on your profile."
            action={<button className="button" onClick={loadRecommendations}>Generate recommendations →</button>}
          />
        ) : (
          <div
            className="recommendations-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}
          >
            <Column title="Reach" data={reach} cls="reach" />
            <Column title="Target" data={target} cls="target" />
            <Column title="Safety" data={safety} cls="safety" />
          </div>
        )}

        {status && !loading && <p className="muted" style={{ marginTop: "1rem" }}>{status}</p>}
      </div>

      {/* Demonstrated Interest + Recs ref */}
      <section className="grid two">
        <div className="card" style={{ padding: "1.75rem" }}>
          <div className="advisory-label" style={{ marginBottom: "0.5rem", color: "var(--teal-deep)", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Demonstrated Interest
          </div>
          <h3 className="subtitle">{PORTFOLIO_GUIDE.demonstratedInterest.title}</h3>
          <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.5rem", marginBottom: "0.85rem" }}>
            {PORTFOLIO_GUIDE.demonstratedInterest.summary}
          </p>
          <ul className="list">
            {PORTFOLIO_GUIDE.demonstratedInterest.ways.slice(0, 4).map((w, i) => (
              <li key={i} style={{ fontSize: "0.88rem" }}>{w}</li>
            ))}
          </ul>
          <Link to="/guide#interest" style={{ color: "var(--teal-deep)", fontSize: "0.78rem", fontWeight: 700, marginTop: "1rem", display: "inline-block" }}>
            Full guidance →
          </Link>
        </div>

        <div className="card" style={{ padding: "1.75rem" }}>
          <div className="advisory-label" style={{ marginBottom: "0.5rem", color: "var(--teal-deep)", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Recommendation Letters
          </div>
          <h3 className="subtitle">{PORTFOLIO_GUIDE.recommendations.title}</h3>
          <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.5rem", marginBottom: "0.85rem" }}>
            {PORTFOLIO_GUIDE.recommendations.summary}
          </p>
          <ul className="list">
            {PORTFOLIO_GUIDE.recommendations.timeline.map((t, i) => (
              <li key={i} style={{ fontSize: "0.88rem" }}>{t}</li>
            ))}
          </ul>
          <Link to="/guide#recs" style={{ color: "var(--teal-deep)", fontSize: "0.78rem", fontWeight: 700, marginTop: "1rem", display: "inline-block" }}>
            Full guidance →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Column({ title, data, cls }) {
  return (
    <div>
      <div className={`rec-col-header ${cls}`}>{title}</div>
      <div className="rec-col-body">
        {data.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: "1.5rem 0", fontSize: "0.85rem" }}>
            No matches yet.
          </p>
        ) : (
          data.map((uni) => <UniversityCard key={uni.id} university={uni} />)
        )}
      </div>
    </div>
  );
}

function UniversityCard({ university }) {
  const flag = FLAG[university.country] || "🏛";
  const match = university.matchPercentage || 50;
  return (
    <article
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "0.65rem",
        alignItems: "start",
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--r-md)",
        padding: "0.85rem 1rem"
      }}
    >
      <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{flag}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.25 }}>
          {university.name}
        </div>
        <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.15rem", lineHeight: 1.35 }}>
          {university.explanation || "Top-tier research, competitive"}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--teal-deep)", lineHeight: 1 }}>{match}%</div>
        <div style={{ fontSize: "0.65rem", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.2rem", fontWeight: 600 }}>
          Match
        </div>
      </div>
    </article>
  );
}
