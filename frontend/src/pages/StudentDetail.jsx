import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import Skeleton from "../components/Skeleton.jsx";

const FLAG = { US: "🇺🇸", UK: "🇬🇧", China: "🇨🇳" };

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    apiFetch(`/api/parents/me/students/${studentId}`)
      .then(setData)
      .catch((err) => {
        console.error(err);
        alert("Failed to load student data");
        navigate("/parent");
      })
      .finally(() => setLoading(false));
  }, [studentId, navigate]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: "2rem" }}>
        <Skeleton lines={3} />
        <Skeleton lines={5} />
      </div>
    );
  }
  if (!data) return null;

  const { profile, academics, tests, activities, awards, documents, tasks = [], savedUniversities = [], essays = [], acceptance } = data;

  const calculateGPA = () => {
    if (!academics?.length) return "—";
    const gm = { "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, "D-": 0.7, F: 0.0 };
    const ib = (s) => ({ 7: 4.0, 6: 3.7, 5: 3.3, 4: 3.0, 3: 2.0, 2: 1.0, 1: 0.0 })[s] || 0;
    let t = 0, c = 0;
    academics.forEach((r) => {
      const p = gm[r.grade] ?? (!isNaN(r.grade) ? ib(parseInt(r.grade)) : 0);
      if (p > 0) { t += p; c++; }
    });
    return c ? (t / c).toFixed(2) : "—";
  };

  const gpa = calculateGPA();
  const completion = Math.round(
    ((academics.length > 0 ? 1 : 0) * 0.2 +
     (tests.length > 0 ? 1 : 0) * 0.2 +
     (activities.length > 0 ? 1 : 0) * 0.3 +
     (awards.length > 0 ? 1 : 0) * 0.15 +
     (documents.length > 0 ? 1 : 0) * 0.15) * 100
  );

  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date());

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "academics", label: "Academics", count: academics.length },
    { id: "tests", label: "Tests", count: tests.length },
    { id: "activities", label: "Activities", count: activities.length },
    { id: "awards", label: "Awards", count: awards.length },
    { id: "essays", label: "Essays", count: essays.length },
    { id: "colleges", label: "College List", count: savedUniversities.length },
    { id: "tasks", label: "Tasks", count: tasks.length, alert: overdueTasks.length > 0 },
    { id: "documents", label: "Documents", count: documents.length }
  ];

  return (
    <div>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <button
          className="button ghost"
          onClick={() => navigate("/parent")}
          style={{ marginBottom: "1.25rem", padding: "0.5rem 1rem", fontSize: "0.7rem" }}
        >
          ← Parent Dashboard
        </button>
        <div className="eyebrow">Student Portfolio · Parent View (read-only)</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          {profile.name}
        </h1>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          {profile.email}
          {profile.grade_level ? ` · ${profile.grade_level}` : ""}
          {profile.school ? ` · ${profile.school}` : ""}
        </p>
        <div style={{ marginTop: "1.5rem", maxWidth: "480px" }}>
          <div className="flex-between" style={{ marginBottom: "0.4rem", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600 }}>
            <span>Portfolio completion</span>
            <span style={{ color: "var(--ink)" }}>{completion}%</span>
          </div>
          <div className="progress large">
            <span style={{ width: `${completion}%` }} />
          </div>
        </div>
      </header>

      {/* Overdue tasks banner */}
      {overdueTasks.length > 0 && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            background: "var(--error-soft)",
            borderLeft: "3px solid var(--error)",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--error)", fontWeight: 700 }}>Heads up</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--ink)" }}>
              {overdueTasks.length} task{overdueTasks.length === 1 ? "" : "s"} overdue for {profile.name}.
            </div>
          </div>
          <button onClick={() => setActiveTab("tasks")} className="button ghost" style={{ padding: "0.4rem 0.85rem", fontSize: "0.7rem" }}>
            See tasks →
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <section className="stats-grid">
        <div className="stat-card"><div className="value">{gpa}</div><div className="label">GPA</div></div>
        {acceptance?.average !== undefined && (
          <div className="stat-card" style={{ borderTopColor: "var(--gold-deep)" }}>
            <div className="value" style={{ color: "var(--gold-deep)" }}>{acceptance.average}%</div>
            <div className="label">Avg Acceptance</div>
          </div>
        )}
        <div className="stat-card"><div className="value">{tests.length}</div><div className="label">Test Scores</div></div>
        <div className="stat-card"><div className="value">{activities.length}</div><div className="label">Activities</div></div>
        <div className="stat-card"><div className="value">{awards.length}</div><div className="label">Awards</div></div>
        <div className="stat-card"><div className="value">{essays.length}</div><div className="label">Essays</div></div>
        <div className="stat-card"><div className="value">{savedUniversities.length}</div><div className="label">Saved Schools</div></div>
        <div className="stat-card"><div className="value">{documents.length}</div><div className="label">Documents</div></div>
      </section>

      {/* Tab nav */}
      <nav style={{ display: "flex", gap: "0", flexWrap: "wrap", borderBottom: "1px solid var(--rule)", marginBottom: "2rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.85rem 1.15rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid var(--gold)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-muted)",
              fontFamily: "inherit",
              fontSize: "0.82rem",
              fontWeight: activeTab === tab.id ? 600 : 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              marginBottom: "-1px",
              position: "relative"
            }}
          >
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: tab.alert ? "var(--error)" : "var(--gold-deep)", fontWeight: 700 }}>
                {tab.count}
              </span>
            )}
            {tab.alert && (
              <span style={{ position: "absolute", top: "0.5rem", right: "0.5rem", width: "6px", height: "6px", background: "var(--error)", borderRadius: "50%" }} />
            )}
          </button>
        ))}
      </nav>

      {/* ===== Overview ===== */}
      {activeTab === "overview" && (
        <>
          <div className="grid two">
            <div className="card">
              <h2 className="section-title" style={{ fontSize: "1.25rem" }}>Profile</h2>
              <Row label="Grade Level" value={profile.grade_level} />
              <Row label="School" value={profile.school} />
              <Row label="Target Countries" value={profile.target_countries} />
              <Row label="Intended Major" value={profile.intended_major} />
              <Row label="Class Rank" value={profile.class_rank} />
              {profile.bio && (
                <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--rule-soft)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.5rem" }}>Bio</div>
                  <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink-soft)", lineHeight: 1.65 }}>{profile.bio}</p>
                </div>
              )}
            </div>

            <div>
              {acceptance && (
                <div className="card" style={{ marginBottom: "1.25rem", borderTop: "2px solid var(--gold)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.5rem" }}>
                    AI Acceptance Probability
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, color: "var(--gold-deep)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {acceptance.average}<span style={{ fontSize: "1rem", color: "var(--ink-muted)" }}>%</span>
                  </div>
                  {acceptance.by_bucket && (
                    <div style={{ marginTop: "0.85rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                      <div style={{ padding: "0.5rem", background: "var(--error-soft)", color: "var(--error)" }}>R · {acceptance.by_bucket.reach || 0}%</div>
                      <div style={{ padding: "0.5rem", background: "var(--gold-soft)", color: "var(--gold-deep)" }}>T · {acceptance.by_bucket.target || 0}%</div>
                      <div style={{ padding: "0.5rem", background: "var(--success-soft)", color: "var(--success)" }}>S · {acceptance.by_bucket.safety || 0}%</div>
                    </div>
                  )}
                  {acceptance.note && (
                    <p className="text-muted" style={{ marginTop: "0.75rem", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>
                      {acceptance.note}
                    </p>
                  )}
                </div>
              )}
              <div className="card">
                <h2 className="section-title" style={{ fontSize: "1.25rem" }}>At a glance</h2>
                <Row label="Academic Records" value={academics.length} />
                <Row label="Test Scores" value={tests.length} />
                <Row label="Activities" value={activities.length} />
                <Row label="Awards" value={awards.length} />
                <Row label="Essays Drafted" value={essays.length} />
                <Row label="College List" value={`${savedUniversities.length} schools`} />
                <Row label="Open Tasks" value={tasks.filter((t) => t.status !== "done").length} />
                <Row label="Documents" value={documents.length} />
              </div>
            </div>
          </div>

          <div className="card highlight" style={{ marginTop: "1.75rem" }}>
            <div className="advisory-label">Completion tips</div>
            <ul className="list" style={{ marginTop: "0.5rem" }}>
              {academics.length < 3 && <li>Add at least 3 academic records for portfolio strength</li>}
              {tests.length < 2 && <li>Add at least 2 standardized test scores</li>}
              {activities.length < 4 && <li>Add more activities to demonstrate range and impact</li>}
              {awards.length < 2 && <li>Add awards and honors to highlight achievements</li>}
              {essays.length === 0 && <li>Start the Common App personal statement (650 words)</li>}
              {savedUniversities.length === 0 && <li>Build a balanced college list (8–12 schools across Reach/Target/Safety)</li>}
              {academics.length >= 3 && tests.length >= 2 && activities.length >= 4 && awards.length >= 2 && essays.length > 0 && savedUniversities.length > 0 && (
                <li style={{ color: "var(--success)", fontWeight: 600 }}>Portfolio looks strong. Keep refining.</li>
              )}
            </ul>
          </div>
        </>
      )}

      {/* ===== Academics ===== */}
      {activeTab === "academics" && (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {academics.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No academic records yet.</p>}
          {academics.map((r) => (
            <article key={r.id} className="card compact flex-between">
              <div>
                <div className="subtitle" style={{ fontSize: "1rem" }}>{r.course}</div>
                <p className="text-muted" style={{ marginTop: "0.25rem" }}>{r.year || "—"} · {r.level || "Standard"}</p>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 700, color: "var(--gold-deep)" }}>{r.grade || "—"}</div>
            </article>
          ))}
        </div>
      )}

      {/* ===== Tests ===== */}
      {activeTab === "tests" && (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {tests.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No test scores yet.</p>}
          {tests.map((t) => (
            <article key={t.id} className="card compact flex-between">
              <div>
                <div className="subtitle" style={{ fontSize: "1rem" }}>{t.test_type}</div>
                <p className="text-muted" style={{ marginTop: "0.25rem" }}>
                  {t.test_date ? new Date(t.test_date).toLocaleDateString() : "—"}
                  {t.superscore ? ` · super ${t.superscore}` : ""}
                </p>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 700, color: "var(--gold-deep)" }}>{t.superscore || t.score || "—"}</div>
            </article>
          ))}
        </div>
      )}

      {/* ===== Activities ===== */}
      {activeTab === "activities" && (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {activities.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No activities yet.</p>}
          {activities.map((a, idx) => (
            <article key={a.id} className="card">
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-deep)" }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--ink)" }}>{a.title}</strong>
                    {a.leadership ? <span className="badge primary">Leadership</span> : null}
                    {a.category ? <span className="badge">{a.category}</span> : null}
                  </div>
                  <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    {a.role}{a.hours_per_week ? ` · ${a.hours_per_week} hrs/wk` : ""}
                  </p>
                  {a.description && (
                    <p style={{ fontFamily: "var(--font-serif)", fontSize: "0.92rem", color: "var(--ink-soft)", marginTop: "0.5rem", lineHeight: 1.55 }}>
                      {a.description}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ===== Awards ===== */}
      {activeTab === "awards" && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {awards.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No awards yet.</p>}
          {awards.map((a) => (
            <div key={a.id} className="card compact">
              <div className="subtitle">{a.title}</div>
              {a.description && <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.4rem" }}>{a.description}</p>}
              {a.award_date && <p className="text-muted" style={{ marginTop: "0.4rem" }}>{new Date(a.award_date).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ===== Essays ===== */}
      {activeTab === "essays" && (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {essays.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No essays drafted yet.</p>}
          {essays.map((e) => (
            <article key={e.id} className="card compact flex-between">
              <div>
                <div className="subtitle" style={{ fontSize: "1rem" }}>{e.title || "Untitled Essay"}</div>
                <p className="text-muted" style={{ marginTop: "0.25rem" }}>
                  {e.word_count || 0} words
                  {e.last_edited_at && ` · Last edited ${new Date(e.last_edited_at).toLocaleDateString()}`}
                </p>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 700, color: e.word_count > 650 ? "var(--error)" : e.word_count >= 500 ? "var(--success)" : "var(--ink-muted)" }}>
                {e.word_count > 650 ? "Over 650" : e.word_count >= 500 ? "Ready" : "Draft"}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ===== Colleges ===== */}
      {activeTab === "colleges" && (
        <div>
          {savedUniversities.length === 0 ? (
            <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No colleges saved yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {["reach", "target", "safety"].map((bucket) => {
                const list = savedUniversities.filter((u) => u.bucket === bucket);
                if (!list.length) return null;
                const accent = bucket === "reach" ? "var(--error)" : bucket === "target" ? "var(--gold-deep)" : "var(--success)";
                return (
                  <section key={bucket}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.85rem", marginBottom: "0.75rem", paddingBottom: "0.4rem", borderBottom: `2px solid ${accent}` }}>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--ink)", textTransform: "capitalize" }}>{bucket}</h3>
                      <span className="text-muted">{list.length} school{list.length === 1 ? "" : "s"}</span>
                    </div>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {list.map((s) => (
                        <div key={s.id} className="card compact" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "1rem", alignItems: "center" }}>
                          <span style={{ fontSize: "1.25rem" }}>{FLAG[s.country] || "🏛"}</span>
                          <div>
                            <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{s.name}</strong>
                            <p className="text-muted" style={{ marginTop: "0.15rem" }}>{s.country}{s.city ? ` · ${s.city}` : ""}{s.selectivity_band ? ` · ${s.selectivity_band}` : ""}</p>
                          </div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
                            {s.application_round || "—"}
                          </div>
                          <div className="mono" style={{ fontSize: "0.85rem", color: "var(--ink)", fontWeight: 600 }}>
                            {s.deadline ? new Date(s.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Tasks ===== */}
      {activeTab === "tasks" && (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {tasks.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No tasks tracked yet.</p>}
          {tasks.map((t) => {
            const isOverdue = t.status !== "done" && t.due_date && new Date(t.due_date) < new Date();
            return (
              <article
                key={t.id}
                className="card compact"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "0.85rem",
                  alignItems: "start",
                  borderLeft: isOverdue ? "2px solid var(--error)" : t.status === "done" ? "2px solid var(--success)" : t.status === "in_progress" ? "2px solid var(--gold)" : "1px solid var(--rule)"
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: `2px solid ${t.status === "done" ? "var(--success)" : isOverdue ? "var(--error)" : t.status === "in_progress" ? "var(--gold-deep)" : "var(--rule)"}`,
                    background: t.status === "done" ? "var(--success)" : "transparent",
                    color: "var(--paper)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    lineHeight: "16px",
                    marginTop: "2px"
                  }}
                >
                  {t.status === "done" ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", color: "var(--ink)", fontWeight: 600, textDecoration: t.status === "done" ? "line-through" : "none", opacity: t.status === "done" ? 0.6 : 1 }}>
                    {t.title}
                  </div>
                  <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "baseline" }}>
                    <span className="badge">{t.category || "general"}</span>
                    {t.due_date && (
                      <span style={{ fontSize: "0.75rem", color: isOverdue ? "var(--error)" : "var(--ink-muted)", fontWeight: 600 }}>
                        Due {new Date(t.due_date).toLocaleDateString()}
                        {isOverdue && " — overdue"}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600 }}>
                  {t.status?.replace("_", " ")}
                </span>
              </article>
            );
          })}
        </div>
      )}

      {/* ===== Documents ===== */}
      {activeTab === "documents" && (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {documents.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No documents uploaded.</p>}
          {documents.map((d) => (
            <div key={d.id} className="card compact flex-between">
              <div>
                <strong style={{ color: "var(--ink)" }}>{d.original_name || d.filename || "Document"}</strong>
                <p className="text-muted" style={{ marginTop: "0.25rem" }}>
                  {d.category} · {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: "1px solid var(--rule-soft)" }}>
      <span className="muted" style={{ fontSize: "0.85rem" }}>{label}</span>
      <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{value || "—"}</strong>
    </div>
  );
}
