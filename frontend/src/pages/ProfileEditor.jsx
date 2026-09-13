import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, apiUpload, getUserRole } from "../api/client";
import AdvisoryNote, { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";
import PersonalityTest from "../components/PersonalityTest.jsx";
import CareerTest from "../components/CareerTest.jsx";

const GRADE_YEAR_OPTIONS = [
  "Grade 6 / Year 7",
  "Grade 7 / Year 8",
  "Grade 8 / Year 9",
  "Grade 9 / Year 10",
  "Grade 10 / Year 11",
  "Grade 11 / Year 12",
  "Grade 12 / Year 13"
];

const TARGET_COUNTRY_OPTIONS = [
  "United States", "United Kingdom", "Canada", "Australia",
  "China", "Hong Kong", "Singapore", "Japan",
  "Netherlands", "Germany", "Switzerland", "Other"
];

const STATEMENT_WORD_LIMIT = 500;
const wordCount = (t) => (t || "").trim() ? (t || "").trim().split(/\s+/).length : 0;

export default function ProfileEditor() {
  const navigate = useNavigate();
  const role = getUserRole();

  useEffect(() => {
    if (role === "parent") navigate("/parent", { replace: true });
  }, [role, navigate]);

  if (role === "parent") return null;

  const [activeSection, setActiveSection] = useState("academics");
  const [profile, setProfile] = useState({
    grade_level: "",
    school: "",
    target_countries: "",
    intended_major: "",
    class_rank: "",
    bio: ""
  });
  const [academics, setAcademics] = useState([]);
  const [tests, setTests] = useState([]);
  const [awards, setAwards] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [essays, setEssays] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [academicForm, setAcademicForm] = useState({ year: "", course: "", level: "", grade: "", school_system: "" });
  const [testForm, setTestForm] = useState({ test_type: "", test_date: "", score: "", superscore: "" });
  const [awardForm, setAwardForm] = useState({ title: "", description: "", award_date: "" });
  const [uploadForm, setUploadForm] = useState({ category: "academics", file: null });
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const pickFile = (f) => { if (f) setUploadForm((prev) => ({ ...prev, file: f })); };
  const [status, setStatus] = useState("");
  const [academicAdvisory, setAcademicAdvisory] = useState({}); // { [year]: { score, advisory, recommendations } }
  const [advisoryLoading, setAdvisoryLoading] = useState("");
  const [testAdvisory, setTestAdvisory] = useState(null);
  const [testAdvisoryLoading, setTestAdvisoryLoading] = useState(false);
  const [recAdvisory, setRecAdvisory] = useState(null);
  const [docAdvisory, setDocAdvisory] = useState(null);
  const [docAiLoading, setDocAiLoading] = useState("");
  const [yearForms, setYearForms] = useState({}); // { [year]: { course, level, grade } }
  const [bioFeedback, setBioFeedback] = useState(null);
  const [bioFbLoading, setBioFbLoading] = useState(false);
  const [adviaiOn, setAdviaiOn] = useState(false); // AdviAI feature flag (from plan) — assume OFF until loaded
  const [planLoaded, setPlanLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const testsReady = planLoaded && profileLoaded; // gate the tests until grade/plan are known

  const getBioFeedback = async () => {
    if (!profile.bio || !profile.bio.trim()) { alert("Write your statement first."); return; }
    setBioFbLoading(true);
    try {
      setBioFeedback(await apiFetch("/api/ai/essay-feedback", { method: "POST", body: JSON.stringify({ essay: profile.bio }) }));
    } catch (err) { alert(err.message || "Could not get EssAI feedback"); }
    finally { setBioFbLoading(false); }
  };

  const setYearField = (yr, key, val) =>
    setYearForms((prev) => ({ ...prev, [yr]: { course: "", level: "", grade: "", ...(prev[yr] || {}), [key]: val } }));
  const addAcademicForYear = async (yr, e) => {
    e.preventDefault();
    const f = yearForms[yr] || {};
    if (!f.course) { alert("Please enter a course name."); return; }
    try {
      await apiFetch("/api/students/me/academics", {
        method: "POST",
        body: JSON.stringify({ year: yr, course: f.course || "", level: f.level || "", grade: f.grade || "", school_system: f.level || "" })
      });
      setYearForms((prev) => ({ ...prev, [yr]: { course: "", level: "", grade: "" } }));
      setAcademics(await apiFetch("/api/students/me/academics"));
    } catch (err) {
      alert(`Could not add course: ${err.message}. If your session expired, please log in again with a student account.`);
    }
  };

  const runAcademicAdvisory = async (year, records) => {
    setAdvisoryLoading(year);
    try {
      const data = await apiFetch("/api/ai/academic-advisory", { method: "POST", body: JSON.stringify({ year, records }) });
      setAcademicAdvisory((prev) => ({ ...prev, [year]: data }));
    } catch (err) { /* ignore */ } finally { setAdvisoryLoading(""); }
  };
  const runTestAdvisory = async () => {
    setTestAdvisoryLoading(true);
    try { setTestAdvisory(await apiFetch("/api/ai/test-advisory")); } catch (err) { /* ignore */ } finally { setTestAdvisoryLoading(false); }
  };
  const runRecAdvisory = async () => {
    setDocAiLoading("rec");
    try { setRecAdvisory(await apiFetch("/api/ai/recommendation-advisory")); } catch (err) { /* ignore */ } finally { setDocAiLoading(""); }
  };
  const runDocAdvisory = async () => {
    setDocAiLoading("doc");
    try { setDocAdvisory(await apiFetch("/api/ai/document-advisory")); } catch (err) { /* ignore */ } finally { setDocAiLoading(""); }
  };

  useEffect(() => {
    apiFetch("/api/students/me")
      .then((data) => {
        if (data) {
          setProfile({
            grade_level: data.grade_level || "",
            school: data.school || "",
            target_countries: data.target_countries || "",
            intended_major: data.intended_major || "",
            class_rank: data.class_rank || "",
            bio: data.bio || ""
          });
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
    apiFetch("/api/students/me/academics").then(setAcademics).catch(() => {});
    apiFetch("/api/students/me/tests").then(setTests).catch(() => {});
    apiFetch("/api/students/me/awards").then(setAwards).catch(() => {});
    apiFetch("/api/uploads/me").then(setDocuments).catch(() => {});
    apiFetch("/api/students/me/essays").then((d) => setEssays(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch("/api/students/me/plan").then((p) => setAdviaiOn(!!p?.features?.adviai)).catch(() => {}).finally(() => setPlanLoaded(true));
  }, []);

  const updateField = (key) => (e) => setProfile((prev) => ({ ...prev, [key]: e.target.value }));

  // Up to 3 intended majors stored comma-separated in intended_major
  const majors = (() => {
    const arr = (profile.intended_major || "").split(",").map((s) => s.trim());
    return [arr[0] || "", arr[1] || "", arr[2] || ""];
  })();
  const setMajor = (i) => (e) => {
    const next = [...majors];
    next[i] = e.target.value;
    setProfile((prev) => ({ ...prev, intended_major: next.map((s) => s.trim()).filter(Boolean).join(", ") }));
  };

  // Target countries stored comma-separated, chosen via multi-select chips (max 3 targets)
  const selectedCountries = (profile.target_countries || "").split(",").map((s) => s.trim()).filter(Boolean);
  const toggleCountry = (c) => {
    const set = new Set(selectedCountries);
    if (set.has(c)) set.delete(c);
    else { if (set.size >= 3) return; set.add(c); }
    setProfile((prev) => ({ ...prev, target_countries: Array.from(set).join(", ") }));
  };

  const saveProfile = async () => {
    setStatus("Saving…");
    try {
      await apiFetch("/api/students/me", { method: "PUT", body: JSON.stringify(profile) });
      setStatus("Saved.");
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setStatus(err.message);
    }
  };

  const addAcademic = async (e) => {
    e.preventDefault();
    await apiFetch("/api/students/me/academics", { method: "POST", body: JSON.stringify(academicForm) });
    setAcademicForm({ year: "", course: "", level: "", grade: "", school_system: "" });
    setAcademics(await apiFetch("/api/students/me/academics"));
  };
  const deleteAcademic = async (id) => {
    await apiFetch(`/api/students/me/academics/${id}`, { method: "DELETE" });
    setAcademics(await apiFetch("/api/students/me/academics"));
  };
  const addTest = async (e) => {
    e.preventDefault();
    if (!testForm.test_type) { alert("Please choose a test first."); return; }
    try {
      await apiFetch("/api/students/me/tests", { method: "POST", body: JSON.stringify(testForm) });
      setTestForm({ test_type: "", test_date: "", score: "", superscore: "" });
      setTests(await apiFetch("/api/students/me/tests"));
    } catch (err) {
      alert(`Could not add test: ${err.message}. If this says "Student only" or your session expired, please log in with a student account.`);
    }
  };
  const deleteTest = async (id) => {
    await apiFetch(`/api/students/me/tests/${id}`, { method: "DELETE" });
    setTests(await apiFetch("/api/students/me/tests"));
  };
  const addAward = async (e) => {
    e.preventDefault();
    if (!awardForm.title) { alert("Please enter an award title."); return; }
    try {
      await apiFetch("/api/students/me/awards", { method: "POST", body: JSON.stringify(awardForm) });
      setAwardForm({ title: "", description: "", award_date: "" });
      setAwards(await apiFetch("/api/students/me/awards"));
    } catch (err) {
      alert(`Could not add award: ${err.message}. If your session expired, please log in again with a student account.`);
    }
  };
  const deleteAward = async (id) => {
    await apiFetch(`/api/students/me/awards/${id}`, { method: "DELETE" });
    setAwards(await apiFetch("/api/students/me/awards"));
  };
  const uploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) { setStatus("Please select a file"); return; }
    setStatus("Uploading…");
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("category", uploadForm.category);
      await apiUpload("/api/uploads/me", formData);
      setStatus("Uploaded.");
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
      setUploadForm({ category: "academics", file: null });
      setDocuments(await apiFetch("/api/uploads/me"));
      setTimeout(() => setStatus(""), 2500);
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
    }
  };
  const deleteDocument = async (id) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await apiFetch(`/api/uploads/me/${id}`, { method: "DELETE" });
    setDocuments(await apiFetch("/api/uploads/me"));
  };
  const loadInviteCode = async () => {
    const data = await apiFetch("/api/students/me/invite");
    setInviteCode(data.invite_code);
  };

  const sections = [
    { id: "personal", label: "Personal", num: "01" },
    { id: "academics", label: "Academics", num: "02" },
    { id: "extracurriculars", label: "Extracurricular", num: "03" },
    { id: "awards", label: "Awards", num: "04" },
    { id: "documents", label: "Documents", num: "05" }
  ];

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Portfolio Editor</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Your portfolio, section by section.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
          Capture what admissions officers actually weigh. Each section
          includes guidance from the Excellent Portfolio Guide.
        </p>
      </header>

      <div className="profile-editor-layout">
        {/* Sidebar */}
        <aside className="pe-sidebar">
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              marginBottom: "1.25rem",
              fontWeight: 600
            }}
          >
            Sections
          </div>
          <nav style={{ display: "grid", gap: "0.25rem" }}>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.85rem",
                  padding: "0.75rem 0",
                  paddingLeft: activeSection === section.id ? "0.85rem" : "0",
                  borderLeft: activeSection === section.id ? "2px solid var(--gold)" : "2px solid transparent",
                  background: "transparent",
                  border: "none",
                  borderLeftWidth: "2px",
                  borderLeftStyle: "solid",
                  borderLeftColor: activeSection === section.id ? "var(--gold)" : "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: activeSection === section.id ? "var(--ink)" : "var(--ink-muted)",
                  fontWeight: activeSection === section.id ? 600 : 500,
                  fontSize: "0.95rem",
                  transition: "all 0.15s ease"
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "0.78rem",
                    color: "var(--gold-deep)",
                    letterSpacing: "0.05em"
                  }}
                >
                  {section.num}
                </span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ height: "1px", background: "var(--rule)", margin: "2rem 0" }} />

          <div className="card" style={{ background: "var(--surface-warm)", padding: "1.25rem" }}>
            <div
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--gold-deep)",
                fontWeight: 600,
                marginBottom: "0.5rem"
              }}
            >
              Parent Invite Code
            </div>
            <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>
              Share with a parent so they can view your portfolio.
            </p>
            {inviteCode ? (
              <div>
                <div
                  className="mono"
                  style={{
                    padding: "0.6rem",
                    background: "var(--surface)",
                    border: "1px solid var(--rule)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textAlign: "center",
                    color: "var(--ink)",
                    marginBottom: "0.5rem"
                  }}
                >
                  {inviteCode}
                </div>
                <button
                  className="button ghost"
                  style={{ width: "100%", fontSize: "0.72rem" }}
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    alert("Code copied");
                  }}
                >
                  Copy code
                </button>
              </div>
            ) : (
              <button className="button gold" style={{ width: "100%", fontSize: "0.72rem" }} onClick={loadInviteCode}>
                Generate code
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div>
          {activeSection === "personal" && (
            <section className="card" style={{ padding: "2.25rem" }}>
              <SectionHead num="01" title="Personal Information" sub="The basics that frame your application." />

              <AdvisoryNote title="Hooks — what matters here" label="Strategic note">
                <p>
                  Your background, intended major, and target countries
                  shape the rest of your portfolio. If you have a hook —
                  first-gen, recruited athlete, underrepresented background,
                  extraordinary achievement — surface it here.{" "}
                  <Link to="/guide#hooks" style={{ color: "var(--gold-deep)", fontWeight: 600 }}>
                    See hooks guide →
                  </Link>
                </p>
              </AdvisoryNote>

              <div className="grid two">
                <div className="input">
                  <label>School Name</label>
                  <input value={profile.school} onChange={updateField("school")} placeholder="Your school" />
                </div>
                <div className="input">
                  <label>Current Grade/Year</label>
                  <select value={profile.grade_level} onChange={updateField("grade_level")}>
                    <option value="">Select grade/year</option>
                    {GRADE_YEAR_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input">
                <label>Target Countries <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(pick up to 3)</span></label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {TARGET_COUNTRY_OPTIONS.map((c) => {
                    const active = selectedCountries.includes(c);
                    const disabled = !active && selectedCountries.length >= 3;
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => toggleCountry(c)}
                        disabled={disabled}
                        className={active ? "badge primary" : "badge"}
                        style={{
                          cursor: disabled ? "not-allowed" : "pointer",
                          border: active ? "1px solid var(--gold-deep)" : "1px solid var(--rule)",
                          background: active ? "var(--gold-deep)" : "var(--surface)",
                          color: active ? "#fff" : "var(--ink-soft)",
                          opacity: disabled ? 0.4 : 1,
                          padding: "0.4rem 0.85rem",
                          fontSize: "0.82rem"
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="input">
                <label>Intended Majors <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(up to 3, in order of preference)</span></label>
                <div style={{ display: "grid", gap: "0.6rem" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold-deep)", minWidth: "1.5rem" }}>{i + 1}.</span>
                      <input
                        style={{ flex: 1 }}
                        value={majors[i]}
                        onChange={setMajor(i)}
                        placeholder={i === 0 ? "1st choice — e.g. Computer Science" : i === 1 ? "2nd choice" : "3rd choice"}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="input">
                <label>Class Rank (optional)</label>
                <input value={profile.class_rank} onChange={updateField("class_rank")} placeholder="e.g. 5 / 420 or Top 2%" />
              </div>
              <div className="input">
                <div className="flex-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                  <label style={{ marginBottom: 0 }}>Short Statement <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(max {STATEMENT_WORD_LIMIT} words)</span></label>
                  <button type="button" className="button gold" style={{ padding: "0.35rem 0.9rem", fontSize: "0.72rem" }} disabled={bioFbLoading} onClick={getBioFeedback}>
                    {bioFbLoading ? "Analyzing…" : "Get EssAI feedback"}
                  </button>
                </div>
                <textarea
                  rows="6"
                  value={profile.bio}
                  onChange={(e) => {
                    if (wordCount(e.target.value) <= STATEMENT_WORD_LIMIT) updateField("bio")(e);
                  }}
                  placeholder="A short statement about your academic goals and what excites you."
                />
                <small className="text-muted" style={{ alignSelf: "flex-end", color: wordCount(profile.bio) >= STATEMENT_WORD_LIMIT ? "var(--warn)" : undefined }}>
                  {wordCount(profile.bio)}/{STATEMENT_WORD_LIMIT} words
                </small>

                {bioFeedback && (
                  <div style={{ marginTop: "0.85rem", padding: "0.95rem 1.1rem", background: "var(--surface-warm)", borderLeft: "3px solid var(--gold)" }}>
                    <div className="flex-between" style={{ marginBottom: "0.4rem" }}>
                      <div className="eyebrow" style={{ paddingLeft: 0, display: "block", color: "var(--gold-deep)" }}>EssAI Feedback</div>
                      {bioFeedback.overall && (
                        <span className="badge primary">Score: {bioFeedback.overall.score}/100</span>
                      )}
                    </div>
                    {bioFeedback.overall?.feedback && (
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--ink-soft)", fontStyle: "italic", lineHeight: 1.5 }}>{bioFeedback.overall.feedback}</p>
                    )}
                    {["clarity", "structure", "grammar"].map((cat) => {
                      const block = bioFeedback[cat];
                      if (!block || !(block.suggestions || []).length) return null;
                      return (
                        <div key={cat} style={{ marginTop: "0.5rem" }}>
                          <div style={{ fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600 }}>{cat}</div>
                          <ul className="list">
                            {block.suggestions.map((s, i) => <li key={i} style={{ fontSize: "0.82rem" }}>{s}</li>)}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "0.5rem", display: "grid", gap: "1rem" }}>
                {/* IPIP-50 Big Five personality test (PRO) */}
                <PersonalityTest adviaiOn={adviaiOn} gradeLevel={profile.grade_level} ready={testsReady} />

                {/* RIASEC / Holland Code career-interest test (PRO) */}
                <CareerTest adviaiOn={adviaiOn} gradeLevel={profile.grade_level} ready={testsReady} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem", gap: "0.75rem", alignItems: "center" }}>
                {status && <span className="muted" style={{ fontSize: "0.85rem" }}>{status}</span>}
                <button className="button" onClick={saveProfile}>Save</button>
              </div>
            </section>
          )}

          {activeSection === "academics" && (
            <section className="card" style={{ padding: "2.25rem" }}>
              <SectionHead num="02" title="Academics" sub="GPA, course rigor, and standardized test scores." />

              <SectionAdviAI section="academics" adviaiOn={adviaiOn} intro="Generate AI advice on your GPA, course rigor, and class rank for your target schools." />

              <h3 className="subtitle" style={{ marginTop: "2rem", marginBottom: "0.35rem" }}>Section I · Yearly academic results</h3>
              <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                Add each year's courses, then get an AI advisory and academic score for that year.
              </p>

              <div style={{ display: "grid", gap: "1.25rem", marginBottom: "2rem" }}>
                {GRADE_YEAR_OPTIONS.map((yr) => {
                  const rows = academics.filter((a) => a.year === yr);
                  const adv = academicAdvisory[yr];
                  const f = yearForms[yr] || { course: "", level: "", grade: "" };
                  return (
                    <div key={yr} className="card compact" style={{ background: "var(--surface-warm)", padding: "1.25rem" }}>
                      <div className="flex-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--ink)" }}>{yr}</strong>
                        {adviaiOn && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span className="badge primary" title="AdviAI academic score for this year">
                              Score (AdviAI): {adv ? `${adv.score}/100` : "—"}
                            </span>
                            <button
                              className="button ghost"
                              style={{ padding: "0.35rem 0.85rem", fontSize: "0.7rem" }}
                              disabled={advisoryLoading === yr || rows.length === 0}
                              title={rows.length === 0 ? "Add courses first" : "Get AdviAI advisory & score for this year"}
                              onClick={() => runAcademicAdvisory(yr, rows.map((r) => ({ course: r.course, level: r.level, grade: r.grade })))}
                            >
                              {advisoryLoading === yr ? "Analyzing…" : adv ? "Re-run AdviAI" : "AdviAI advisory & score"}
                            </button>
                          </div>
                        )}
                      </div>

                      {rows.length > 0 ? (
                        <table style={{ marginBottom: "0.85rem" }}>
                          <tbody>
                            {rows.map((item) => (
                              <tr key={item.id}>
                                <td>{item.course || "—"}</td>
                                <td>{item.level && <span className="badge">{item.level}</span>}</td>
                                <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>{item.grade || "—"}</td>
                                <td style={{ textAlign: "right" }}>
                                  <button className="button ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }} onClick={() => deleteAcademic(item.id)}>
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>No courses added for this year yet.</p>
                      )}

                      <form onSubmit={(e) => addAcademicForYear(yr, e)}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.6rem", alignItems: "end" }}>
                          <div className="input" style={{ marginBottom: 0 }}>
                            <label>Course</label>
                            <input value={f.course} onChange={(e) => setYearField(yr, "course", e.target.value)} placeholder="AP Calculus BC" />
                          </div>
                          <div className="input" style={{ marginBottom: 0 }}>
                            <label>Level</label>
                            <select value={f.level} onChange={(e) => setYearField(yr, "level", e.target.value)}>
                              <option value="">—</option>
                              <option value="AP">AP</option>
                              <option value="IB HL">IB HL</option>
                              <option value="IB SL">IB SL</option>
                              <option value="A-Level">A-Level</option>
                              <option value="Honors">Honors</option>
                              <option value="Standard">Standard</option>
                            </select>
                          </div>
                          <div className="input" style={{ marginBottom: 0 }}>
                            <label>Grade</label>
                            <input value={f.grade} onChange={(e) => setYearField(yr, "grade", e.target.value)} placeholder="A / 7" />
                          </div>
                          <button className="button" type="submit">Add</button>
                        </div>
                      </form>

                      {adv && (
                        <div style={{ marginTop: "0.85rem", padding: "0.85rem 1rem", background: "var(--surface)", borderLeft: "2px solid var(--gold)" }}>
                          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.35rem" }}>Advisory (AI)</div>
                          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>{adv.advisory}</p>
                          {Array.isArray(adv.recommendations) && adv.recommendations.length > 0 && (
                            <ul className="list" style={{ marginTop: "0.5rem" }}>
                              {adv.recommendations.map((r, i) => <li key={i} style={{ fontSize: "0.85rem" }}>{r}</li>)}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex-between" style={{ marginTop: "2rem", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <h3 className="subtitle" style={{ marginBottom: 0 }}>Section II · Standardized tests</h3>
                {adviaiOn && (
                  <button className="button ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem" }} disabled={testAdvisoryLoading} onClick={runTestAdvisory}>
                    {testAdvisoryLoading ? "Analyzing…" : testAdvisory ? "Re-run AdviAI" : "AdviAI test advisory"}
                  </button>
                )}
              </div>

              <form onSubmit={addTest} style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                  <div className="input" style={{ marginBottom: 0 }}>
                    <label>Test</label>
                    <select value={testForm.test_type} onChange={(e) => setTestForm({ ...testForm, test_type: e.target.value })}>
                      <option value="">—</option>
                      <optgroup label="Standardized">
                        <option value="SAT">SAT</option>
                        <option value="ACT">ACT</option>
                        <option value="PSAT">PSAT / NMSQT</option>
                      </optgroup>
                      <optgroup label="English Proficiency">
                        <option value="IELTS">IELTS</option>
                        <option value="TOEFL">TOEFL</option>
                        <option value="Duolingo">Duolingo</option>
                      </optgroup>
                      <optgroup label="AP — STEM">
                        <option value="AP Calculus BC">AP Calculus BC</option>
                        <option value="AP Calculus AB">AP Calculus AB</option>
                        <option value="AP Statistics">AP Statistics</option>
                        <option value="AP Physics C: Mechanics">AP Physics C: Mechanics</option>
                        <option value="AP Physics C: E&amp;M">AP Physics C: E&M</option>
                        <option value="AP Physics 1">AP Physics 1</option>
                        <option value="AP Physics 2">AP Physics 2</option>
                        <option value="AP Chemistry">AP Chemistry</option>
                        <option value="AP Biology">AP Biology</option>
                        <option value="AP Computer Science A">AP Computer Science A</option>
                        <option value="AP Computer Science Principles">AP Computer Science Principles</option>
                        <option value="AP Environmental Science">AP Environmental Science</option>
                      </optgroup>
                      <optgroup label="AP — Humanities">
                        <option value="AP English Language">AP English Language</option>
                        <option value="AP English Literature">AP English Literature</option>
                        <option value="AP US History">AP US History</option>
                        <option value="AP World History">AP World History</option>
                        <option value="AP European History">AP European History</option>
                        <option value="AP US Government">AP US Government</option>
                        <option value="AP Comparative Government">AP Comparative Government</option>
                        <option value="AP Macroeconomics">AP Macroeconomics</option>
                        <option value="AP Microeconomics">AP Microeconomics</option>
                        <option value="AP Psychology">AP Psychology</option>
                        <option value="AP Human Geography">AP Human Geography</option>
                      </optgroup>
                      <optgroup label="AP — Languages & Arts">
                        <option value="AP Spanish Language">AP Spanish Language</option>
                        <option value="AP French Language">AP French Language</option>
                        <option value="AP Chinese Language">AP Chinese Language</option>
                        <option value="AP Latin">AP Latin</option>
                        <option value="AP Art History">AP Art History</option>
                        <option value="AP Studio Art">AP Studio Art</option>
                        <option value="AP Music Theory">AP Music Theory</option>
                      </optgroup>
                    </select>
                  </div>
                  <div className="input" style={{ marginBottom: 0 }}>
                    <label>Date</label>
                    <input type="date" value={testForm.test_date} onChange={(e) => setTestForm({ ...testForm, test_date: e.target.value })} />
                  </div>
                  <div className="input" style={{ marginBottom: 0 }}>
                    <label>Score</label>
                    <input value={testForm.score} onChange={(e) => setTestForm({ ...testForm, score: e.target.value })} placeholder="1500" />
                  </div>
                  <div className="input" style={{ marginBottom: 0 }}>
                    <label>Superscore</label>
                    <input value={testForm.superscore} onChange={(e) => setTestForm({ ...testForm, superscore: e.target.value })} placeholder="1540" />
                  </div>
                  <button className="button" type="submit">Add</button>
                </div>
              </form>

              {tests.length > 0 && (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {tests.map((item) => (
                    <div key={item.id} className="card compact flex-between" style={{ background: "var(--surface-warm)" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", marginRight: "0.75rem" }}>
                          {item.test_type}
                        </span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-deep)", letterSpacing: "-0.01em" }}>
                          {item.superscore || item.score}
                        </span>
                        <span className="muted" style={{ marginLeft: "1rem", fontSize: "0.85rem" }}>
                          {item.test_date || ""}{item.superscore ? ` · super ${item.superscore}` : ""}
                        </span>
                      </div>
                      <button className="button ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }} onClick={() => deleteTest(item.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ADVISORY (AI) + Recommended tests (AI) — appended below the tests */}
              {testAdvisory && (
                <div style={{ marginTop: "1.5rem", padding: "1rem 1.1rem", background: "var(--surface-warm)", borderLeft: "3px solid var(--gold)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.4rem", color: "var(--gold-deep)" }}>Advisory (AI)</div>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>{testAdvisory.advisory}</p>
                  {Array.isArray(testAdvisory.recommended_tests) && testAdvisory.recommended_tests.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.35rem" }}>Recommended tests (AI)</div>
                      <ul className="list">
                        {testAdvisory.recommended_tests.map((t, i) => (
                          <li key={i} style={{ fontSize: "0.85rem" }}><strong>{t.test}</strong> — {t.why}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {activeSection === "extracurriculars" && (
            <section className="card" style={{ padding: "2.25rem" }}>
              <SectionHead num="03" title="Extracurricular Activities" sub="Depth over breadth — the spike strategy." />
              <SectionAdviAI section="extracurricular" adviaiOn={adviaiOn} intro="Generate AI advice on building your spike and higher-impact activities." />
              <p className="muted" style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
                Open the Extracurricular Activity Editor to capture leadership,
                hours per week, AdviAI topic &amp; summary, and an AdviAI score for each activity.
              </p>
              <button className="button" onClick={() => navigate("/activities")}>
                Add Extracurricular Activity →
              </button>
            </section>
          )}

          {activeSection === "awards" && (
            <section className="card" style={{ padding: "2.25rem" }}>
              <SectionHead num="04" title="Awards & Honors" sub="National competitions move the needle. School honors still count." />

              <SectionAdviAI section="awards" adviaiOn={adviaiOn} intro="Generate AI advice on which competitions to pursue and how to leverage your honors." />

              {/* Competition awards reference */}
              <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                <div className="flex-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: 0 }}>
                    Competition awards to pursue
                  </div>
                  <Link to="/guide#academic" style={{ color: "var(--gold-deep)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Full list →
                  </Link>
                </div>
                <div className="grid two">
                  {Object.entries(PORTFOLIO_GUIDE.awardsByTier.competitions).map(([area, items]) => (
                    <div key={area} className="card compact" style={{ background: "var(--surface-warm)" }}>
                      <div className="subtitle" style={{ fontSize: "0.92rem", textTransform: "capitalize" }}>
                        {area === "cs" ? "Computer Science" : area}
                      </div>
                      <ul className="list" style={{ marginTop: "0.4rem" }}>
                        {items.slice(0, 4).map((it, i) => <li key={i} style={{ fontSize: "0.8rem" }}>{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={addAward} style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                <div className="grid two">
                  <div className="input">
                    <label>Title</label>
                    <input value={awardForm.title} onChange={(e) => setAwardForm({ ...awardForm, title: e.target.value })} placeholder="National Merit Finalist" />
                  </div>
                  <div className="input">
                    <label>Date</label>
                    <input type="date" value={awardForm.award_date} onChange={(e) => setAwardForm({ ...awardForm, award_date: e.target.value })} />
                  </div>
                </div>
                <div className="input">
                  <label>Description</label>
                  <textarea rows="3" value={awardForm.description} onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })} placeholder="Recognition, ranking, and what it signals." />
                </div>
                <button className="button" type="submit">Add award</button>
              </form>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                {awards.map((item) => (
                  <div key={item.id} className="card compact" style={{ background: "var(--surface-warm)" }}>
                    <div className="flex-between" style={{ alignItems: "start" }}>
                      <div style={{ flex: 1 }}>
                        <div className="subtitle">{item.title}</div>
                        {item.description && <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.4rem" }}>{item.description}</p>}
                        {item.award_date && <p className="text-muted" style={{ marginTop: "0.4rem" }}>{item.award_date}</p>}
                      </div>
                      <button className="button ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }} onClick={() => deleteAward(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {awards.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "1.5rem" }}>No awards added yet.</p>}
              </div>
            </section>
          )}

          {activeSection === "documents" && (
            <section className="card" style={{ padding: "2.25rem" }}>
              <SectionHead num="05" title="Documents" sub="Transcripts, score reports, and portfolio attachments." />

              <div style={{ marginBottom: "1.5rem" }}>
                <SectionAdviAI section="documents" adviaiOn={adviaiOn} intro="Generate AI advice on your essays, recommendation letters, and supporting documents." />
              </div>

              {/* Section I — Essays (topic + summary, up to 5, overall AI score) */}
              <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--rule-soft)" }}>
                <div className="flex-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h3 className="subtitle" style={{ marginBottom: 0 }}>Section I · Essay <span className="badge" style={{ marginLeft: "0.4rem" }}>{essays.length}/5</span></h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    {(() => {
                      const scored = essays.filter((e) => e.ai_score != null);
                      if (!scored.length) return null;
                      const avg = Math.round(scored.reduce((s, e) => s + Number(e.ai_score), 0) / scored.length);
                      return <span className="badge primary" title="Average AI score across your scored essays">Overall score (AI): {avg}/100</span>;
                    })()}
                    <button className="button" style={{ padding: "0.45rem 1rem", fontSize: "0.78rem" }} onClick={() => navigate("/essay")}>
                      Open EssAI →
                    </button>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                  Topic, summary and AI overall score for each essay (up to 5). Full writing, AI feedback and Edit &amp; Apply live in EssAI.
                </p>
                {essays.length === 0 ? (
                  <p className="muted" style={{ fontSize: "0.85rem" }}>No essays yet. Open EssAI to start your first one.</p>
                ) : (
                  <div style={{ display: "grid", gap: "0.6rem" }}>
                    {essays.slice(0, 5).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => navigate(`/essay?id=${e.id}`)}
                        className="card compact"
                        style={{ background: "var(--surface-warm)", textAlign: "left", cursor: "pointer", border: "1px solid var(--rule)", fontFamily: "inherit" }}
                      >
                        <div className="flex-between" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
                          <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--ink)" }}>{e.title || "Untitled"}</strong>
                          <span style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <span className="badge" style={{ textTransform: "capitalize" }}>{e.status || "draft"}</span>
                            {e.ai_score != null && <span className="badge primary">Score (AI): {e.ai_score}/100</span>}
                          </span>
                        </div>
                        {e.topic && <div style={{ fontSize: "0.78rem", fontStyle: "italic", color: "var(--ink-soft)", marginTop: "0.2rem" }}>Topic: {e.topic}</div>}
                        {e.summary && <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem", lineHeight: 1.4 }}>{e.summary}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {status && (
                <div
                  className="card compact"
                  style={{
                    marginBottom: "1rem",
                    background:
                      status.includes("Upload") || status.includes("success") ? "var(--success-soft)" :
                      status.includes("fail") || status.includes("error") ? "var(--error-soft)" : "var(--paper)",
                    border: "none",
                    borderLeft: `2px solid ${
                      status.includes("Upload") || status.includes("success") ? "var(--success)" :
                      status.includes("fail") || status.includes("error") ? "var(--error)" : "var(--rule)"
                    }`
                  }}
                >
                  <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>{status}</p>
                </div>
              )}

              <form onSubmit={uploadDocument} style={{ marginBottom: "1.5rem" }}>
                <div className="grid two">
                  <div className="input">
                    <label>Category</label>
                    <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
                      <option value="academics">Academics</option>
                      <option value="awards">Awards</option>
                      <option value="tests">Test Scores</option>
                      <option value="activities">Activities</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div className="input">
                    <label>File</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                      style={{
                        cursor: "pointer",
                        border: `2px dashed ${dragOver ? "var(--gold-deep)" : "var(--rule)"}`,
                        borderRadius: "var(--r-md)",
                        background: dragOver ? "var(--surface-warm)" : "var(--surface)",
                        padding: "1.1rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        transition: "all 0.15s ease",
                        minHeight: "58px"
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        key={uploadForm.file ? "has" : "no"}
                        onChange={(e) => pickFile(e.target.files?.[0])}
                      />
                      <span style={{ display: "inline-flex", width: "34px", height: "34px", borderRadius: "50%", background: "var(--surface-warm)", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--gold-deep)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      </span>
                      {uploadForm.file ? (
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{uploadForm.file.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>{(uploadForm.file.size / 1024).toFixed(0)} KB · click to change</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)" }}>Click to choose a file</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>or drag &amp; drop it here (PDF, image, doc)</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button className="button" type="submit" disabled={!uploadForm.file || status === "Uploading…"}>
                  {status === "Uploading…" ? "Uploading…" : "Upload document"}
                </button>
              </form>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                {documents.length === 0 ? (
                  <p className="muted" style={{ textAlign: "center", padding: "1.5rem" }}>No documents uploaded yet.</p>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.id} className="card compact flex-between">
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: "var(--ink)" }}>{doc.original_name || doc.filename || "Document"}</strong>
                        <p className="text-muted" style={{ marginTop: "0.25rem" }}>
                          {doc.category} · {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <a
                          href={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${doc.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button ghost"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }}
                        >
                          View
                        </a>
                        <button
                          className="button ghost"
                          onClick={() => deleteDocument(doc.id)}
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem", color: "var(--error)", borderColor: "var(--error)" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Section II — Recommendation Letters (AdviAI advisory + timeline) */}
              <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--rule-soft)" }}>
                <div className="flex-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h3 className="subtitle" style={{ marginBottom: 0 }}>Section II · Recommendation Letters</h3>
                  {adviaiOn ? (
                    <button className="button ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem" }} disabled={docAiLoading === "rec"} onClick={runRecAdvisory}>
                      {docAiLoading === "rec" ? "Analyzing…" : recAdvisory ? "Re-run AdviAI" : "AdviAI advisory"}
                    </button>
                  ) : (
                    <Link to="/pricing" className="badge" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem", border: "1px dashed var(--gold)", color: "var(--gold-deep)" }}>AdviAI · Upgrade →</Link>
                  )}
                </div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  Upload teacher/counselor letters above with category “General”. {adviaiOn ? "Use AdviAI for who to ask and when." : "Upgrade to unlock AdviAI advice on who to ask and when."}
                </p>
                {adviaiOn && <AdvisoryPanel data={recAdvisory} />}
                <div style={{ marginTop: "0.75rem" }}>
                  <Link to="/essay" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--teal-deep)" }}>Open EssAI →</Link>
                </div>
              </div>

              {/* Section III — Additional Documents (AdviAI advisory + timeline) */}
              <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--rule-soft)" }}>
                <div className="flex-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h3 className="subtitle" style={{ marginBottom: 0 }}>Section III · Additional Documents</h3>
                  {adviaiOn ? (
                    <button className="button ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem" }} disabled={docAiLoading === "doc"} onClick={runDocAdvisory}>
                      {docAiLoading === "doc" ? "Analyzing…" : docAdvisory ? "Re-run AdviAI" : "AdviAI advisory"}
                    </button>
                  ) : (
                    <Link to="/pricing" className="badge" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem", border: "1px dashed var(--gold)", color: "var(--gold-deep)" }}>AdviAI · Upgrade →</Link>
                  )}
                </div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  Portfolios, research abstracts, résumés, or media that reinforce your spike. {!adviaiOn && "Upgrade to unlock AdviAI advice."}
                </p>
                {adviaiOn && <AdvisoryPanel data={docAdvisory} />}
                <div style={{ marginTop: "0.75rem" }}>
                  <Link to="/essay" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--teal-deep)" }}>Open EssAI →</Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function AdviAiUpgrade() {
  return (
    <aside className="advisory" style={{ borderStyle: "dashed" }}>
      <div className="advisory-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>AdviAI</span>
        <span className="badge">Paid</span>
      </div>
      <h4>AI advisory is a paid feature</h4>
      <p style={{ fontSize: "0.9rem" }}>
        Upgrade to <strong>Essential</strong> or <strong>Professional</strong> to unlock <strong>AdviAI</strong> —
        personalized AI advisory and scoring for your academics (per-year advice, standardized-test guidance, and more).
      </p>
      <Link to="/pricing" className="button gold" style={{ marginTop: "0.6rem", display: "inline-block" }}>
        View plans &amp; upgrade →
      </Link>
    </aside>
  );
}

function TestCard({ title, desc, path, adviaiOn, renderResult }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const run = async () => {
    setLoading(true);
    try { setData(await apiFetch(path)); }
    catch (err) { alert(err.message || "Could not run"); }
    finally { setLoading(false); }
  };
  return (
    <div className="card compact" style={{ background: "var(--surface-warm)" }}>
      <div className="subtitle" style={{ fontSize: "0.95rem" }}>{title} <span className="badge" style={{ fontSize: "0.6rem", marginLeft: "0.3rem" }}>AdviAI</span></div>
      <p className="muted" style={{ fontSize: "0.82rem", margin: "0.4rem 0 0.75rem" }}>{desc}</p>
      {!adviaiOn ? (
        <Link to="/pricing" className="button ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>Upgrade to unlock →</Link>
      ) : !data ? (
        <button type="button" className="button gold" style={{ fontSize: "0.75rem" }} disabled={loading} onClick={run}>
          {loading ? "Analyzing…" : "Get recommendations (AdviAI)"}
        </button>
      ) : (
        <div>
          {renderResult(data)}
          <button type="button" className="button ghost" style={{ fontSize: "0.7rem", marginTop: "0.6rem" }} disabled={loading} onClick={run}>
            {loading ? "…" : "Re-run"}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionAdviAI({ section, adviaiOn, intro }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  if (!adviaiOn) return <AdviAiUpgrade />;
  const run = async () => {
    setLoading(true);
    try {
      setData(await apiFetch("/api/ai/section-advisory", { method: "POST", body: JSON.stringify({ section }) }));
    } catch (err) { alert(err.message || "Could not generate AdviAI advice"); }
    finally { setLoading(false); }
  };
  return (
    <aside className="advisory">
      <div className="advisory-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <span>AdviAI</span>
        <button className="button gold" style={{ padding: "0.3rem 0.85rem", fontSize: "0.7rem" }} disabled={loading} onClick={run}>
          {loading ? "Thinking…" : data ? "Refresh" : "Generate AdviAI advice"}
        </button>
      </div>
      {data ? (
        <>
          <p>{data.advisory}</p>
          {Array.isArray(data.tips) && data.tips.length > 0 && (
            <ul>{data.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          )}
        </>
      ) : (
        <p style={{ fontSize: "0.9rem" }}>{intro || "Get personalized AI advice for this section, based on your profile and target schools."}</p>
      )}
    </aside>
  );
}

function AdvisoryPanel({ data }) {
  if (!data) return null;
  return (
    <div style={{ padding: "0.95rem 1.1rem", background: "var(--surface-warm)", borderLeft: "2px solid var(--gold)" }}>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>{data.advisory}</p>
      {Array.isArray(data.suggestions) && data.suggestions.length > 0 && (
        <div style={{ marginTop: "0.6rem" }}>
          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.35rem" }}>Feedback &amp; suggestions (AdviAI)</div>
          <ul className="list">
            {data.suggestions.map((s, i) => <li key={i} style={{ fontSize: "0.85rem" }}>{s}</li>)}
          </ul>
        </div>
      )}
      {Array.isArray(data.timeline) && data.timeline.length > 0 && (
        <div style={{ marginTop: "0.6rem" }}>
          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.35rem" }}>Timeline</div>
          <ul className="list">
            {data.timeline.map((t, i) => <li key={i} style={{ fontSize: "0.85rem" }}><strong>{t.when}:</strong> {t.task}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionHead({ num, title, sub }) {
  return (
    <header style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--rule-soft)" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.85rem",
          color: "var(--gold-deep)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          marginBottom: "0.4rem"
        }}
      >
        Section {num}
      </div>
      <h2 className="section-title" style={{ marginBottom: "0.4rem" }}>{title}</h2>
      {sub && <p className="muted" style={{ fontSize: "0.95rem", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>{sub}</p>}
    </header>
  );
}
