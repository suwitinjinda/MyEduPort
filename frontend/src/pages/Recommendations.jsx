import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

const FLAG_EMOJIS = {
  US: "🇺🇸",
  UK: "🇬🇧",
  China: "🇨🇳"
};

export default function Recommendations() {
  const [form, setForm] = useState({ country: "All", major: "", gpa: "3.7" });
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("country");
  const [loading, setLoading] = useState(false);

  // Auto-load recommendations on mount
  useEffect(() => {
    loadRecommendations();
  }, []);

  const updateField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const loadRecommendations = async () => {
    setLoading(true);
    setStatus("Loading recommendations...");
    try {
      const data = await apiFetch("/api/ai/recommendations", {
        method: "POST",
        body: JSON.stringify({ ...form, sortBy })
      });
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
    if (results.length > 0) {
      loadRecommendations();
    }
  };

  // Group results by category
  const reach = results.filter((r) => r.category === "Reach");
  const target = results.filter((r) => r.category === "Target");
  const safety = results.filter((r) => r.category === "Safety");

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          color: "#fff",
          padding: "1.5rem 2rem",
          borderRadius: "0.75rem 0.75rem 0 0",
          marginBottom: "0"
        }}
      >
        <div className="section-title" style={{ color: "#fff", marginBottom: "0" }}>
          AI University Recommendations
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card" style={{ borderRadius: "0 0 0.75rem 0.75rem", marginTop: "0", padding: "2rem" }}>
        {/* Main Heading */}
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
          Your University Recommendations
        </h1>

        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="input" style={{ marginBottom: "0", minWidth: "180px" }}>
            <label>Sort by:</label>
            <select value={sortBy} onChange={handleSortChange}>
              <option value="country">Country</option>
              <option value="match">Match %</option>
              <option value="name">Name</option>
            </select>
          </div>
          <div className="input" style={{ marginBottom: "0", minWidth: "180px" }}>
            <label>Country:</label>
            <select value={form.country} onChange={updateField("country")}>
              <option value="All">All Countries</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="China">China</option>
            </select>
          </div>
          <div className="input" style={{ marginBottom: "0", minWidth: "180px" }}>
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
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {status && !loading && (
          <p className="muted" style={{ marginBottom: "1rem" }}>{status}</p>
        )}

        {/* Category Explanation */}
        <div className="card" style={{ background: "var(--bg-secondary)", marginBottom: "1.5rem", padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", background: "var(--primary)", borderRadius: "50%" }}></div>
                <strong>Reach</strong>
              </div>
              <p className="muted" style={{ fontSize: "0.875rem" }}>
                Highly competitive universities. Admission is challenging even with strong credentials. Match: 25-40%
              </p>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", background: "#14b8a6", borderRadius: "50%" }}></div>
                <strong>Target</strong>
              </div>
              <p className="muted" style={{ fontSize: "0.875rem" }}>
                Good match universities. Admission is likely with your credentials. Match: 50-80%
              </p>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "50%" }}></div>
                <strong>Safety</strong>
              </div>
              <p className="muted" style={{ fontSize: "0.875rem" }}>
                More accessible universities. Good chance of admission with your profile. Match: 60-80%
              </p>
            </div>
          </div>
        </div>

        {/* Three Column Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            marginTop: "2rem"
          }}
          className="recommendations-grid"
        >
          {/* Reach Column */}
          <div>
            <div
              style={{
                background: "var(--primary)",
                color: "#fff",
                padding: "1rem",
                borderRadius: "0.5rem 0.5rem 0 0",
                fontWeight: "700",
                fontSize: "1.125rem",
                textAlign: "center"
              }}
            >
              Reach
            </div>
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "1rem",
                borderRadius: "0 0 0.5rem 0.5rem",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}
            >
              {reach.length === 0 ? (
                <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                  No reach universities found
                </p>
              ) : (
                reach.map((uni) => (
                  <UniversityCard key={uni.id} university={uni} />
                ))
              )}
            </div>
          </div>

          {/* Target Column */}
          <div>
            <div
              style={{
                background: "#14b8a6",
                color: "#fff",
                padding: "1rem",
                borderRadius: "0.5rem 0.5rem 0 0",
                fontWeight: "700",
                fontSize: "1.125rem",
                textAlign: "center"
              }}
            >
              Target
            </div>
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "1rem",
                borderRadius: "0 0 0.5rem 0.5rem",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}
            >
              {target.length === 0 ? (
                <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                  No target universities found
                </p>
              ) : (
                target.map((uni) => (
                  <UniversityCard key={uni.id} university={uni} />
                ))
              )}
            </div>
          </div>

          {/* Safety Column */}
          <div>
            <div
              style={{
                background: "#10b981",
                color: "#fff",
                padding: "1rem",
                borderRadius: "0.5rem 0.5rem 0 0",
                fontWeight: "700",
                fontSize: "1.125rem",
                textAlign: "center"
              }}
            >
              Safety
            </div>
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "1rem",
                borderRadius: "0 0 0.5rem 0.5rem",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}
            >
              {safety.length === 0 ? (
                <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                  No safety universities found
                </p>
              ) : (
                safety.map((uni) => (
                  <UniversityCard key={uni.id} university={uni} />
                ))
              )}
            </div>
          </div>
        </div>

        {results.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p className="muted" style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
              No recommendations yet. Click "Refresh" to generate recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function UniversityCard({ university }) {
  const flag = FLAG_EMOJIS[university.country] || "🏛️";
  const matchPercentage = university.matchPercentage || 50;

  return (
    <div
      className="card"
      style={{
        padding: "1rem",
        margin: "0",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow)";
      }}
    >
      <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
        <div style={{ fontSize: "1.5rem", lineHeight: "1" }}>{flag}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: "700", fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
            {university.name}
          </div>
          <div className="muted" style={{ fontSize: "0.8125rem", lineHeight: "1.4" }}>
            {university.explanation || "Top-tier research, competitive"}
          </div>
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: "700",
            color: "var(--primary)",
            whiteSpace: "nowrap"
          }}
        >
          {matchPercentage}% Match
        </div>
      </div>
    </div>
  );
}
