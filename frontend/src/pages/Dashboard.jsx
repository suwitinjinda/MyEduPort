import React, { useEffect, useState } from "react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import { apiFetch, getUserRole } from "../api/client";
import Skeleton, { SkeletonStats } from "../components/Skeleton.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const role = getUserRole();

  useEffect(() => {
    if (role === "parent") navigate("/parent", { replace: true });
    if (role === "counselor") navigate("/counselor", { replace: true });
  }, [role, navigate]);

  if (role === "parent" || role === "counselor") return null;

  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [academics, setAcademics] = useState([]);
  const [tests, setTests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [awards, setAwards] = useState([]);
  const [essays, setEssays] = useState([]);
  const [gap, setGap] = useState([]);
  const [features, setFeatures] = useState(null); // { gap, predictions, ... } from plan
  const [tasks, setTasks] = useState([]);
  const [acceptance, setAcceptance] = useState(null);
  const [score, setScore] = useState(null);
  const [savedUnis, setSavedUnis] = useState([]);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(true); // collapsible "Quick menu" side nav
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    loadFastData();
    loadAiData();
    apiFetch("/api/students/me/plan").then((p) => setFeatures(p?.features || null)).catch(() => {});
  }, []);

  const loadFastData = async () => {
    try {
      const [u, s, a, t, act, doc, aw, es, tk, prof, su] = await Promise.all([
        apiFetch("/api/auth/me").catch(() => null),
        apiFetch("/api/students/me/summary").catch(() => null),
        apiFetch("/api/students/me/academics").catch(() => []),
        apiFetch("/api/students/me/tests").catch(() => []),
        apiFetch("/api/students/me/activities").catch(() => []).then((d) => Array.isArray(d) ? d : []),
        apiFetch("/api/uploads/me").catch(() => []),
        apiFetch("/api/students/me/awards").catch(() => []),
        apiFetch("/api/students/me/essays").catch(() => []),
        apiFetch("/api/students/me/tasks").catch(() => []),
        apiFetch("/api/students/me").catch(() => null),
        apiFetch("/api/students/me/saved-universities").catch(() => [])
      ]);
      setUser(u);
      setSummary(s);
      setAcademics(a || []);
      setTests(t || []);
      setActivities(act || []);
      setDocuments(doc || []);
      setAwards(aw || []);
      setEssays(es || []);
      setTasks(tk || []);
      setProfile(prof);
      setSavedUnis(Array.isArray(su) ? su : []);
    } finally {
      setLoading(false);
    }
  };

  // Target countries (up to 3) — quick edit from the dashboard, saved to profile
  // Curated, high-level application guidance shown per selected target country.
  const COUNTRY_ADVICE = {
    "United States": "Apply via the Common App / Coalition. Expect essays, SAT/ACT (test-optional at many schools) and 2 teacher recs. Watch Early Decision/Action deadlines (~Nov 1).",
    "United Kingdom": "Apply through UCAS (up to 5 courses). One subject-focused personal statement + predicted grades; Oxbridge/medicine deadline is mid-October.",
    "Canada": "Apply directly to each university (OUAC in Ontario). Grades-driven; some programs want a supplementary essay. Deadlines run Dec–Mar.",
    "Australia": "Apply directly or via a state admissions centre (e.g. UAC). Largely ATAR/grade-based; major intakes in Feb and Jul.",
    "China": "Apply via each university's international portal. Often needs HSK (Chinese) or an English-taught program, plus transcripts and a study plan.",
    "Hong Kong": "Apply directly to each university. Competitive and grade-focused; interviews are common. Main-round deadlines ~Nov–Jan.",
    "Singapore": "Apply directly to NUS/NTU/SMU. Very selective, grade + test focused; some courses interview. Deadlines ~Feb–Mar.",
    "Japan": "Apply via each university (many English-taught programs). May need EJU and/or English scores; essays + study plan expected.",
    "Netherlands": "Apply through Studielink. Many English-taught bachelors; selective 'numerus fixus' courses add tests — deadline often Jan 15.",
    "Germany": "Apply via uni-assist or directly. Low/no tuition at public universities; needs a recognized qualification (sometimes Studienkolleg) + language proof.",
    "Switzerland": "Apply directly to each university. Qualification-based; some programs need an entrance exam and language proof (German/French/English).",
    "Other": "Check each target university's own admissions page for deadlines, required tests, and the application portal."
  };
  const selectedCountries = (profile?.target_countries || "").split(",").map((s) => s.trim()).filter(Boolean);
  const loadAiData = async () => {
    setAiLoading(true);
    try {
      const [g, ap, sc] = await Promise.all([
        apiFetch("/api/ai/gap-analysis").catch(() => []),
        apiFetch("/api/ai/acceptance-probability").catch(() => null),
        apiFetch("/api/ai/score").catch(() => null)
      ]);
      setGap(g || []);
      setAcceptance(ap || null);
      setScore(sc || null);
    } finally {
      setAiLoading(false);
    }
  };

  const calculateGPA = () => {
    if (!academics?.length) return "—";
    const gm = { "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, "D-": 0.7, F: 0.0 };
    const ib = (s) => ({ 7: 4.0, 6: 3.7, 5: 3.3, 4: 3.0, 3: 2.0, 2: 1.0, 1: 0.0 })[s] || 0;
    let t = 0, c = 0;
    academics.forEach((r) => {
      const p = gm[r.grade] ?? (!isNaN(r.grade) ? ib(parseInt(r.grade)) : 0);
      if (p > 0) { t += p; c++; }
    });
    return c === 0 ? "—" : (t / c).toFixed(1);
  };

  const gpa = calculateGPA();
  const userName = user?.name?.split(" ")[0] || "Student";
  const completion = summary?.completion || 0;
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date());

  if (loading) {
    return (
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <Skeleton lines={2} />
        <SkeletonStats count={3} />
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* ───────── Sidebar ───────── */}
      <aside className="dash-sidebar">
        {/* "Quick menu" is a heading, not a link — click to collapse/expand the nav. */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "transparent", border: "none", cursor: "pointer",
            padding: "0.5rem 0.75rem", marginBottom: "0.35rem", fontFamily: "inherit",
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--ink-muted)"
          }}
        >
          <span>Quick menu</span>
          <span aria-hidden style={{ display: "inline-block", transition: "transform 0.2s", transform: menuOpen ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
        </button>
        {menuOpen && (
          <>
            <NavItem to="/profile" icon={<ProfileIcon />} label="Personal" />
            <NavItem to="/profile" icon={<PortfolioIcon />} label="Portfolio" />
            <NavItem to="/recommendations" icon={<UniversityIcon />} label="Universities" />
            <NavItem to="/compare" icon={<CompareIcon />} label="Compare" />
            <NavItem to="/tasks" icon={<TaskIcon />} label="Tasks" badge={overdueTasks.length} />
            <NavItem to="/chat" icon={<ChatIcon />} label="EduBot Chat" />
            <NavItem to="/essay" icon={<EssayIcon />} label="Essays" />
            <NavItem to="/export" icon={<ExportIcon />} label="Portfolio Report" />
            <NavItem to="/settings" icon={<SettingsIcon />} label="Settings" />
          </>
        )}
      </aside>

      {/* ───────── Main ───────── */}
      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Welcome banner */}
        <div
          style={{
            background: "var(--grad)",
            color: "#fff",
            padding: "2rem 2.25rem",
            borderRadius: "var(--r-lg)"
          }}
        >
          <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.35rem" }}>Student Dashboard</div>
          <h1 style={{ color: "#fff", fontSize: "2.25rem", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Welcome, {userName}!
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", opacity: 0.95 }}>Portfolio Completion: {completion}%</span>
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              {score && !aiLoading && (
                <span style={{ fontSize: "0.85rem", opacity: 0.95 }}>
                  Overall Portfolio Score: <strong>{score.overall}/100</strong>
                </span>
              )}
              {acceptance && !aiLoading && (
                <span style={{ fontSize: "0.85rem", opacity: 0.95 }}>
                  Acceptance Prediction: <strong>{acceptance.average}%</strong>
                </span>
              )}
              {!acceptance && !aiLoading && features && features.predictions === 0 && (
                <Link to="/pricing" style={{ fontSize: "0.85rem", opacity: 0.95, color: "#fff", textDecoration: "underline" }}>
                  Acceptance Prediction: Upgrade to unlock →
                </Link>
              )}
            </div>
          </div>
          <div className="progress large" style={{ background: "rgba(255,255,255,0.25)" }}>
            <span style={{ width: `${completion}%`, background: "#22c55e" }} />
          </div>

          {/* Target countries — display only. Edited on the Personal page; this shows
              the current picks plus concise application guidance for each. */}
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9, marginBottom: "0.5rem", fontWeight: 600 }}>
              Target Countries
            </div>
            {selectedCountries.length === 0 ? (
              <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                None chosen yet — <Link to="/profile" style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}>set them in Personal →</Link>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {selectedCountries.map((c) => (
                    <span
                      key={c}
                      style={{
                        padding: "0.3rem 0.7rem", fontSize: "0.78rem", borderRadius: "var(--r-full)",
                        border: "1px solid #fff", background: "#fff", color: "var(--navy)", fontWeight: 700
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.75rem" }}>
                  {selectedCountries.map((c) => (
                    COUNTRY_ADVICE[c] ? (
                      <div key={c} style={{ fontSize: "0.8rem", lineHeight: 1.5, opacity: 0.94 }}>
                        <strong>{c}:</strong> {COUNTRY_ADVICE[c]}
                      </div>
                    ) : null
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Metric cards: Profile strength · Universities matched · Avg. acceptance */}
        <div className="grid three">
          <MetricStat label="Profile Strength" value={score ? `${score.overall}` : (loading || aiLoading ? "…" : `${completion}`)} unit="/ 100" hint="Overall portfolio score" />
          <MetricStat label="Universities Matched" value={savedUnis.length} unit={savedUnis.length === 1 ? "school" : "schools"} hint="Saved to your college list" link="/recommendations" linkText="Find matches →" />
          <MetricStat
            label="Avg. Acceptance Rate"
            value={acceptance ? `${acceptance.average}` : (features && features.predictions === 0 ? "🔒" : (aiLoading ? "…" : "—"))}
            unit={acceptance ? "%" : ""}
            hint={features && features.predictions === 0 ? "Upgrade to unlock" : "Across your saved universities"}
            link={features && features.predictions === 0 ? "/pricing" : undefined}
            linkText={features && features.predictions === 0 ? "Upgrade →" : undefined}
          />
        </div>

        {/* Overdue task banner */}
        {overdueTasks.length > 0 && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              background: "var(--error-soft)",
              borderLeft: "3px solid var(--error)",
              borderRadius: "var(--r-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.85rem"
            }}
          >
            <div>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--error)", fontWeight: 700 }}>
                Action required
              </div>
              <div style={{ color: "var(--ink)", fontWeight: 600, fontSize: "0.95rem" }}>
                {overdueTasks.length} task{overdueTasks.length === 1 ? "" : "s"} overdue.
              </div>
            </div>
            <Link to="/tasks" className="button" style={{ padding: "0.55rem 1.1rem", fontSize: "0.85rem" }}>
              Open tasks →
            </Link>
          </div>
        )}

        {/* 3 KPI cards */}
        <div className="grid three">
          <KpiCard
            title="Academic Score"
            value={score ? score.categories.academic : "—"}
            unit="/ 100"
            details={
              academics.length > 0 ? (
                <div className="list" style={{ marginTop: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", fontSize: "0.88rem", borderBottom: "1px solid var(--rule-soft)" }}>
                    <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>GPA</span>
                    <span style={{ color: "var(--ink-muted)" }}>{gpa}</span>
                  </div>
                  {academics.slice(0, 5).map((r, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", fontSize: "0.88rem", borderBottom: idx < 4 ? "1px solid var(--rule-soft)" : "none" }}>
                      <span style={{ color: "var(--ink-soft)" }}>
                        Course {idx + 1}: {r.course || "—"}
                      </span>
                      <span style={{ color: "var(--ink-muted)" }}>{r.grade}</span>
                    </div>
                  ))}
                  {academics.length > 5 && (
                    <div style={{ marginTop: "0.25rem", fontSize: "0.82rem", color: "var(--ink-muted)" }}>
                      + {academics.length - 5} more courses
                    </div>
                  )}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.85rem" }}>
                  No academic records yet. Add courses in Portfolio.
                </p>
              )
            }
          />

          <KpiCard
            title="Extracurricular Score"
            value={score ? score.categories.extracurricular : "—"}
            unit="/ 100"
            details={
              <>
                <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.85rem" }}>
                  {activities.length} activit{activities.length === 1 ? "y" : "ies"} recorded
                </p>
                <Link to="/activities" className="button" style={{ width: "100%", marginTop: "0.5rem" }}>
                  Add New
                </Link>
              </>
            }
          />

          <KpiCard
            title="Documents Score"
            value={score ? score.categories.essays : "—"}
            unit="/ 100"
            details={
              <>
                <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.85rem" }}>
                  {documents.length} file{documents.length === 1 ? "" : "s"} uploaded
                </p>
                <Link to="/profile" className="button" style={{ width: "100%", marginTop: "0.5rem" }}>
                  Manage
                </Link>
              </>
            }
          />
        </div>

        {/* Next Steps */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Next Steps</h2>
          </div>
          <p className="muted" style={{ marginBottom: "1.25rem" }}>
            Prioritized actions to focus on next:
          </p>

          {aiLoading ? (
            <div>
              <Skeleton lines={5} />
              <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem", fontStyle: "italic" }}>
                Claude is analyzing your portfolio… (~5–10 seconds)
              </p>
            </div>
          ) : gap.length > 0 ? (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {gap.map((item, idx) => {
                const dotColor =
                  item.priority === "High" ? "var(--error)" :
                  item.priority === "Medium" ? "var(--warn)" : "var(--teal-deep)";
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "flex-start",
                      padding: "0.6rem 0.85rem",
                      background: "var(--paper-warm)",
                      borderRadius: "var(--r-md)"
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: dotColor,
                        flexShrink: 0,
                        marginTop: "0.45rem"
                      }}
                    />
                    <div>
                      <strong style={{ color: "var(--ink)", fontWeight: 600 }}>
                        {item.priority || "Suggested"}:
                      </strong>{" "}
                      <span style={{ color: "var(--ink-soft)" }}>{item.action}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : features && features.gap === false ? (
            <UpgradeCard
              title="AI Next Steps is a paid feature"
              body="Upgrade to Essential or Professional to get AI-prioritized next steps and gap analysis for your portfolio."
            />
          ) : (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <button
                className="button"
                onClick={() => { setAiLoading(true); apiFetch("/api/ai/gap-analysis").then(setGap).catch(() => {}).finally(() => setAiLoading(false)); }}
              >
                Generate next steps →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, active, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive || active ? "active" : ""}`}
      end
    >
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
    </NavLink>
  );
}

function UpgradeCard({ title, body }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "1.75rem 1.5rem",
        background: "var(--surface-warm)",
        border: "1px dashed var(--gold)",
        borderRadius: "var(--r-md)"
      }}
    >
      <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-deep)", fontWeight: 700, marginBottom: "0.5rem" }}>
        Upgrade
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--ink)", marginBottom: "0.4rem" }}>{title}</div>
      <p className="muted" style={{ fontSize: "0.88rem", maxWidth: "42ch", margin: "0 auto 1rem" }}>{body}</p>
      <Link to="/pricing" className="button gold" style={{ display: "inline-block" }}>
        View plans →
      </Link>
    </div>
  );
}

function MetricStat({ label, value, unit, hint, link, linkText }) {
  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <div style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600, marginBottom: "0.5rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
        <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
        {unit && <span style={{ fontSize: "0.9rem", color: "var(--ink-muted)", fontWeight: 600 }}>{unit}</span>}
      </div>
      <div className="flex-between" style={{ marginTop: "0.6rem", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: "0.78rem" }}>{hint}</span>
        {link && <Link to={link} style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--teal-deep)" }}>{linkText}</Link>}
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit, details }) {
  return (
    <div className="card">
      <div className="subtitle" style={{ fontSize: "1.05rem", marginBottom: "0.85rem" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <span
          style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            color: "var(--navy)",
            lineHeight: 1,
            letterSpacing: "-0.02em"
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: "1rem", color: "var(--ink-muted)", fontWeight: 600 }}>{unit}</span>
      </div>
      {details}
    </div>
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
