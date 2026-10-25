import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, apiUpload, getUserRole, fileUrl, loadSaved } from "../api/client";
import AdvisoryNote, { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";
import PersonalityTest from "../components/PersonalityTest.jsx";
import CareerTest from "../components/CareerTest.jsx";
import MepaiWorkspace from "../components/MepaiWorkspace.jsx";
import { fmtDate, fmtTime } from "../utils/date.js";

// Subject dropdown for Academics → Section I (moved from the Standardized tests list)
const SUBJECT_GROUPS = [
  { label: "AP — STEM", options: ["AP Calculus BC", "AP Calculus AB", "AP Statistics", "AP Physics C: Mechanics", "AP Physics C: E&M", "AP Physics 1", "AP Physics 2", "AP Chemistry", "AP Biology", "AP Computer Science A", "AP Computer Science Principles", "AP Environmental Science"] },
  { label: "AP — Humanities", options: ["AP English Language", "AP English Literature", "AP US History", "AP World History", "AP European History", "AP US Government", "AP Comparative Government", "AP Macroeconomics", "AP Microeconomics", "AP Psychology", "AP Human Geography"] },
  { label: "AP — Languages & Arts", options: ["AP Spanish Language", "AP French Language", "AP Chinese Language", "AP Latin", "AP Art History", "AP Studio Art", "AP Music Theory"] }
];

// Curriculum is chosen once for all years (Academics → Section I)
const CURRICULUM_GROUPS = [
  { label: "International", options: ["IB Diploma (IBDP)", "IB Middle Years (MYP)", "Cambridge IGCSE", "A-Level"] },
  { label: "American", options: ["AP / US High School", "US Honors"] },
  { label: "Thai", options: ["Thai National Curriculum", "Thai English Program (EP)"] },
  { label: "Other", options: ["Other"] }
];

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

// Curated list of common undergraduate majors for the Intended Majors dropdowns.
const MAJOR_OPTIONS = [
  "Computer Science", "Software Engineering", "Data Science", "Artificial Intelligence",
  "Information Technology", "Electrical Engineering", "Mechanical Engineering",
  "Civil Engineering", "Chemical Engineering", "Aerospace Engineering",
  "Biomedical Engineering", "Engineering (General)", "Mathematics", "Statistics",
  "Physics", "Chemistry", "Biology", "Biochemistry", "Environmental Science",
  "Neuroscience", "Medicine", "Nursing", "Pharmacy", "Public Health", "Dentistry",
  "Veterinary Science", "Psychology", "Economics", "Business Administration", "Finance",
  "Accounting", "Marketing", "Management", "International Business", "Law",
  "Political Science", "International Relations", "Sociology", "Philosophy", "History",
  "English Literature", "Linguistics", "Communications", "Journalism", "Media Studies",
  "Education", "Architecture", "Art & Design", "Music", "Film & Media",
  "Performing Arts", "Anthropology", "Geography", "Agriculture",
  "Hospitality & Tourism", "Sports Science", "Social Work", "Other"
];

const TEST_GROUPS = [
  { label: "Standardized", options: ["SAT", "ACT", "PSAT"] },
  { label: "English Proficiency", options: ["IELTS", "TOEFL", "Duolingo"] }
];

// Options for a grouped list: plain <option>s for a single group, <optgroup>s otherwise
function GroupedOptions({ groups }) {
  if (groups.length === 1) return groups[0].options.map((o) => <option key={o} value={o}>{o}</option>);
  return groups.map((g) => (
    <optgroup key={g.label} label={g.label}>
      {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
    </optgroup>
  ));
}
const flatOptions = (groups) => groups.flatMap((g) => g.options);

const STATEMENT_WORD_LIMIT = 500;
const wordCount = (t) => (t || "").trim() ? (t || "").trim().split(/\s+/).length : 0;

export default function ProfileEditor() {
  const navigate = useNavigate();
  const role = getUserRole();

  useEffect(() => {
    if (role === "parent") navigate("/parent", { replace: true });
  }, [role, navigate]);

  if (role === "parent") return null;

  const [activeSection, setActiveSection] = useState("personal");
  const [profile, setProfile] = useState({
    grade_level: "",
    school: "",
    target_countries: "",
    intended_major: "",
    intended_universities: "",
    class_rank: "",
    bio: ""
  });
  const [uniOptions, setUniOptions] = useState([]); // curated universities for the dropdowns
  const [optionLists, setOptionLists] = useState(null); // admin-editable dropdown lists (/api/options)
  const [academics, setAcademics] = useState([]);
  const [tests, setTests] = useState([]);
  const [awards, setAwards] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [essays, setEssays] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [academicForm, setAcademicForm] = useState({ year: "", course: "", level: "", grade: "", school_system: "" });
  const [testForm, setTestForm] = useState({ test_type: "", test_date: "", score: "", superscore: "" });
  const [awardForm, setAwardForm] = useState({ title: "", description: "", award_date: "" });
  const [awardFile, setAwardFile] = useState(null);
  const [savingAward, setSavingAward] = useState(false);
  const [awardEssai, setAwardEssai] = useState(null); // MEPAi description suggestions
  const [awardEssaiLoading, setAwardEssaiLoading] = useState(false);
  const [awardWsKey, setAwardWsKey] = useState(0); // bump to clear the award workspace after adding
  const awardDraftReady = useRef(false);
  const [uploadForm, setUploadForm] = useState({ category: "academics", file: null });
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const pickFile = (f) => { if (f) setUploadForm((prev) => ({ ...prev, file: f })); };
  const [status, setStatus] = useState("");
  const [testAdvisory, setTestAdvisory] = useState(null);
  const [testAdvisoryLoading, setTestAdvisoryLoading] = useState(false);
  const [recAdvisory, setRecAdvisory] = useState(null);
  const [docAdvisory, setDocAdvisory] = useState(null);
  const [docAiLoading, setDocAiLoading] = useState("");
  const [yearForms, setYearForms] = useState({}); // { [year]: { course, grade } }
  const [curriculum, setCurriculum] = useState("");
  const [openYears, setOpenYears] = useState(null); // Set of expanded year cards; null = default
  const [editingAcademic, setEditingAcademic] = useState(null); // { id, course, grade }
  const [adviaiOn, setAdviaiOn] = useState(false); // MEPAi feature flag (from plan) — assume OFF until loaded
  const [planLoaded, setPlanLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const testsReady = planLoaded && profileLoaded;
  // Dropdown lists — from Admin → Dropdown Lists, falling back to the built-in defaults
  const majorGroups = optionLists?.majors?.length ? optionLists.majors : [{ label: "Majors", options: MAJOR_OPTIONS }];
  const curriculumGroups = optionLists?.curriculums?.length ? optionLists.curriculums : CURRICULUM_GROUPS;
  const subjectGroups = optionLists?.subjects?.length ? optionLists.subjects : SUBJECT_GROUPS;
  const testGroups = optionLists?.tests?.length ? optionLists.tests : TEST_GROUPS; // gate the tests until grade/plan are known


  const setYearField = (yr, key, val) =>
    setYearForms((prev) => ({ ...prev, [yr]: { course: "", grade: "", ...(prev[yr] || {}), [key]: val } }));
  const saveCurriculum = async (value) => {
    const prev = curriculum;
    setCurriculum(value);
    try {
      await apiFetch("/api/students/me/curriculum", { method: "PUT", body: JSON.stringify({ curriculum: value }) });
    } catch (err) { setCurriculum(prev); alert(err.message || "Could not save curriculum"); }
  };
  // Year cards collapse; by default only the student's current grade (or the first year with subjects) is open
  const defaultOpenYear = GRADE_YEAR_OPTIONS.includes(profile.grade_level)
    ? profile.grade_level
    : (GRADE_YEAR_OPTIONS.find((yr) => academics.some((a) => a.year === yr)) || GRADE_YEAR_OPTIONS[0]);
  const isYearOpen = (yr) => (openYears ? openYears.has(yr) : yr === defaultOpenYear);
  const toggleYear = (yr) => setOpenYears((prev) => {
    const next = new Set(prev || [defaultOpenYear]);
    next.has(yr) ? next.delete(yr) : next.add(yr);
    return next;
  });
  const saveAcademicEdit = async () => {
    if (!editingAcademic?.course?.trim()) { alert("Please enter a subject."); return; }
    try {
      await apiFetch(`/api/students/me/academics/${editingAcademic.id}`, {
        method: "PUT",
        body: JSON.stringify({ course: editingAcademic.course, grade: editingAcademic.grade })
      });
      setEditingAcademic(null);
      setAcademics(await apiFetch("/api/students/me/academics"));
    } catch (err) { alert(err.message || "Could not save changes"); }
  };
  const addAcademicForYear = async (yr, e) => {
    e.preventDefault();
    const f = yearForms[yr] || {};
    if (!f.course) { alert("Please enter a subject."); return; }
    try {
      await apiFetch("/api/students/me/academics", {
        method: "POST",
        body: JSON.stringify({ year: yr, course: f.course || "", level: "", grade: f.grade || "", school_system: curriculum })
      });
      setYearForms((prev) => ({ ...prev, [yr]: { course: "", grade: "" } }));
      setAcademics(await apiFetch("/api/students/me/academics"));
    } catch (err) {
      alert(`Could not add subject: ${err.message}. If your session expired, please log in again with a student account.`);
    }
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
            intended_universities: data.intended_universities || "",
            class_rank: data.class_rank || "",
            bio: data.bio || ""
          });
          setCurriculum(data.curriculum || "");
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
    apiFetch("/api/universities").then((d) => setUniOptions(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch("/api/options").then(setOptionLists).catch(() => {});
    // Reopen with the latest saved MEPAi advice (regenerated only when the student asks)
    loadSaved(["test_advisory", "recommendation_advisory", "document_advisory", "award_description", "award_draft"]).then((sv) => {
      if (sv.award_draft?.new?.draft) setAwardForm((f) => ({ ...f, ...sv.award_draft.new.draft })); // continue an unsaved award
      if (sv.test_advisory?.[""]) setTestAdvisory(sv.test_advisory[""]);
      if (sv.recommendation_advisory?.[""]) setRecAdvisory(sv.recommendation_advisory[""]);
      if (sv.document_advisory?.[""]) setDocAdvisory(sv.document_advisory[""]);
      if (sv.award_description?.draft) setAwardEssai(sv.award_description.draft);
    }).finally(() => { awardDraftReady.current = true; });
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

  // Intended universities: 3 ranked picks from the curated list + a 4th free-typed entry.
  // Pipe-delimited (NOT comma) because university names contain commas
  // (e.g. "University of California, Berkeley"). The custom one is saved to the DB on save.
  const intendedUnis = (() => {
    const arr = (profile.intended_universities || "").split("|").map((s) => s.trim());
    return [arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || ""];
  })();
  const setIntendedUni = (i) => (e) => {
    const next = [...intendedUnis];
    next[i] = e.target.value;
    // Keep slot positions (a middle pick may be blank), just trim trailing blanks.
    setProfile((prev) => ({ ...prev, intended_universities: next.map((s) => s.trim()).join("|").replace(/\|+$/, "") }));
  };

  // Up to 3 target countries, in order of preference, stored comma-separated in target_countries
  const countries = (() => {
    const arr = (profile.target_countries || "").split(",").map((s) => s.trim());
    return [arr[0] || "", arr[1] || "", arr[2] || ""];
  })();
  const setCountry = (i) => (e) => {
    const next = [...countries];
    next[i] = e.target.value;
    setProfile((prev) => ({ ...prev, target_countries: next.map((s) => s.trim()).filter(Boolean).join(", ") }));
  };

  // Personal fields autosave shortly after the student stops typing. The personal statement
  // (bio) is left out — it has its own Save in the MEPAi workspace.
  const autosaveReady = useRef(false);
  useEffect(() => {
    if (!profileLoaded) return undefined;
    if (!autosaveReady.current) { autosaveReady.current = true; return undefined; } // skip the initial load
    const t = setTimeout(async () => {
      try {
        const { bio, ...fields } = profile;
        await apiFetch("/api/students/me", { method: "PUT", body: JSON.stringify(fields) });
        setStatus("All changes saved");
        setTimeout(() => setStatus(""), 2500);
      } catch (err) { setStatus(`Not saved: ${err.message}`); }
    }, 1200);
    return () => clearTimeout(t);
  }, [profile.grade_level, profile.school, profile.target_countries, profile.intended_major, profile.intended_universities, profile.class_rank, profileLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async () => {
    setStatus("Saving…");
    try {
      // If item 4 is a university typed by hand (not in the curated list), capture it in the DB.
      const custom = (intendedUnis[3] || "").trim();
      if (custom && !uniOptions.some((u) => (u.name || "").toLowerCase() === custom.toLowerCase())) {
        try { await apiFetch("/api/universities/suggest", { method: "POST", body: JSON.stringify({ name: custom }) }); } catch (e) { /* non-fatal */ }
      }
      const { bio, ...fields } = profile; // statement is saved from its own workspace
      await apiFetch("/api/students/me", { method: "PUT", body: JSON.stringify(fields) });
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
    setSavingAward(true);
    try {
      // Attachment is uploaded as a regular document (category "awards"), then linked to the award
      let document_id = null;
      if (awardFile) {
        const fd = new FormData();
        fd.append("file", awardFile);
        fd.append("category", "awards");
        document_id = (await apiUpload("/api/uploads/me", fd)).id;
      }
      await apiFetch("/api/students/me/awards", { method: "POST", body: JSON.stringify({ ...awardForm, document_id }) });
      setAwardForm({ title: "", description: "", award_date: "" });
      setAwardFile(null);
      setAwardEssai(null);
      await Promise.all([
        ...["award_draft", "award_guidance", "award_grammar"].map((k) => apiFetch(`/api/ai/saved/${k}?scope=new`, { method: "DELETE" }).catch(() => {})),
        apiFetch("/api/ai/saved/award_description?scope=draft", { method: "DELETE" }).catch(() => {})
      ]);
      setAwardWsKey((k) => k + 1);
      setAwards(await apiFetch("/api/students/me/awards"));
      if (document_id) setDocuments(await apiFetch("/api/uploads/me"));
    } catch (err) {
      alert(`Could not add award: ${err.message}. If your session expired, please log in again with a student account.`);
    } finally { setSavingAward(false); }
  };
  // Autosave the award being written (until "Add award")
  useEffect(() => {
    if (!awardDraftReady.current) return undefined;
    const t = setTimeout(() => {
      const empty = !awardForm.title && !awardForm.description && !awardForm.award_date;
      if (empty) apiFetch("/api/ai/saved/award_draft?scope=new", { method: "DELETE" }).catch(() => {});
      else apiFetch("/api/ai/saved/award_draft", { method: "PUT", body: JSON.stringify({ scope: "new", draft: awardForm }) }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [awardForm]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAwardEssai = async () => {
    setAwardEssaiLoading(true);
    try {
      setAwardEssai(await apiFetch("/api/ai/award-description", { method: "POST", body: JSON.stringify({ award: awardForm }) }));
    } catch (err) { alert(err.message || "MEPAi could not write a description"); }
    finally { setAwardEssaiLoading(false); }
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
      if (fileInputRef.current) fileInputRef.current.value = "";
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

              <div className="input form-section">
                <label>Target Countries <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(up to 3, in order of preference)</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.6rem" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold-deep)", minWidth: "1.5rem" }}>{i + 1}.</span>
                      <select style={{ flex: 1 }} value={countries[i]} onChange={setCountry(i)}>
                        <option value="">{i === 0 ? "1st choice — select a country" : i === 1 ? "2nd choice" : "3rd choice"}</option>
                        {countries[i] && !TARGET_COUNTRY_OPTIONS.includes(countries[i]) && (
                          <option value={countries[i]}>{countries[i]}</option>
                        )}
                        {TARGET_COUNTRY_OPTIONS.filter((c) => c === countries[i] || !countries.includes(c)).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="input form-section">
                <label>Intended Universities <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(up to 3, in order of preference)</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.6rem" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold-deep)", minWidth: "1.5rem" }}>{i + 1}.</span>
                      <select style={{ flex: 1 }} value={intendedUnis[i]} onChange={setIntendedUni(i)}>
                        <option value="">{i === 0 ? "1st choice — select a university" : i === 1 ? "2nd choice" : "3rd choice"}</option>
                        {intendedUnis[i] && !uniOptions.some((u) => u.name === intendedUnis[i]) && (
                          <option value={intendedUnis[i]}>{intendedUnis[i]}</option>
                        )}
                        {uniOptions.map((u) => (
                          <option key={u.id} value={u.name}>{u.name}{u.country ? ` (${u.country})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold-deep)", minWidth: "1.5rem" }}>4.</span>
                    <input style={{ flex: 1 }} value={intendedUnis[3]} onChange={setIntendedUni(3)} placeholder="Other — type a university not in the list" />
                  </div>
                </div>
                <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.4rem" }}>Pick from the list, or type your own in row 4 — it'll be added to the database.</p>
              </div>

              <div className="input form-section">
                <label>Intended Majors <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(up to 3, in order of preference)</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.6rem" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold-deep)", minWidth: "1.5rem" }}>{i + 1}.</span>
                      <select style={{ flex: 1 }} value={majors[i]} onChange={setMajor(i)}>
                        <option value="">{i === 0 ? "1st choice — select a major" : i === 1 ? "2nd choice" : "3rd choice"}</option>
                        {majors[i] && !flatOptions(majorGroups).includes(majors[i]) && (
                          <option value={majors[i]}>{majors[i]}</option>
                        )}
                        <GroupedOptions groups={majorGroups} />
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="input">
                <label>Class Rank (optional)</label>
                <input value={profile.class_rank} onChange={updateField("class_rank")} placeholder="e.g. 5 / 420 or Top 2%" />
              </div>
              <MepaiStatementWorkspace
                value={profile.bio}
                onChange={(bio) => setProfile((prev) => ({ ...prev, bio }))}
                target={(profile.intended_universities || "").split("|").map((x) => x.trim()).filter(Boolean)[0] || ""}
                loaded={profileLoaded}
              />

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
              <SectionHead num="02" title="Academics" sub="GPA, Standardized tests" />

              <SectionAdviAI section="academics" adviaiOn={adviaiOn} intro="Generate AI advice on your GPA, course rigor, and class rank for your target schools." />

              <div className="flex-between" style={{ marginTop: "2rem", marginBottom: "0.35rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <h3 className="subtitle" style={{ marginBottom: 0 }}>Section I · Yearly academic results</h3>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button type="button" className="button ghost" style={{ padding: "0.3rem 0.75rem", fontSize: "0.7rem" }} onClick={() => setOpenYears(new Set(GRADE_YEAR_OPTIONS))}>Expand all</button>
                  <button type="button" className="button ghost" style={{ padding: "0.3rem 0.75rem", fontSize: "0.7rem" }} onClick={() => setOpenYears(new Set())}>Collapse all</button>
                </div>
              </div>
              <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                Choose your curriculum, then add each year's subjects and grades.
              </p>

              <div className="input form-section" style={{ marginTop: 0 }}>
                <label>Curriculums</label>
                <select value={curriculum} onChange={(e) => saveCurriculum(e.target.value)} style={{ maxWidth: "420px" }}>
                  <option value="">— Select your curriculum —</option>
                  {curriculum && !flatOptions(curriculumGroups).includes(curriculum) && <option value={curriculum}>{curriculum}</option>}
                  <GroupedOptions groups={curriculumGroups} />
                </select>
                <p className="text-muted" style={{ fontSize: "0.78rem", margin: 0 }}>Applies to all years below. Saved automatically.</p>
              </div>

              <div style={{ display: "grid", gap: "0.85rem", marginBottom: "2rem" }}>
                {GRADE_YEAR_OPTIONS.map((yr) => {
                  const rows = academics.filter((a) => a.year === yr);
                  const f = yearForms[yr] || { course: "", grade: "" };
                  const open = isYearOpen(yr);
                  return (
                    <div key={yr} className="card compact" style={{ background: "var(--surface-warm)", padding: "0.9rem 1.25rem" }}>
                      <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => toggleYear(yr)}
                          aria-expanded={open}
                          style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", padding: "0.25rem 0", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                        >
                          <span style={{ display: "inline-block", transition: "transform 0.15s ease", transform: open ? "rotate(90deg)" : "none", color: "var(--gold-deep)", fontSize: "0.8rem" }}>▶</span>
                          <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--ink)" }}>{yr}</strong>
                          <span className="badge">{rows.length} {rows.length === 1 ? "subject" : "subjects"}</span>
                        </button>
                      </div>

                      {open && (
                        <div style={{ marginTop: "0.85rem" }}>
                          {rows.length > 0 ? (
                            <table style={{ marginBottom: "0.85rem" }}>
                              <thead>
                                <tr><th style={{ textAlign: "left" }}>Subject</th><th style={{ textAlign: "left" }}>Grade</th><th /></tr>
                              </thead>
                              <tbody>
                                {rows.map((item) => editingAcademic?.id === item.id ? (
                                  <tr key={item.id}>
                                    <td><SubjectPicker groups={subjectGroups} value={editingAcademic.course} onChange={(v) => setEditingAcademic({ ...editingAcademic, course: v })} /></td>
                                    <td><input value={editingAcademic.grade} onChange={(e) => setEditingAcademic({ ...editingAcademic, grade: e.target.value })} style={{ width: "6rem" }} /></td>
                                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                      <button className="button" style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem", marginRight: "0.35rem" }} onClick={saveAcademicEdit}>Save</button>
                                      <button className="button ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }} onClick={() => setEditingAcademic(null)}>Cancel</button>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={item.id}>
                                    <td>
                                      {item.course || "—"}
                                      {item.level && <span className="badge" style={{ marginLeft: "0.4rem" }}>{item.level}</span>}
                                    </td>
                                    <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>{item.grade || "—"}</td>
                                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                      <button className="button ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem", marginRight: "0.35rem" }} onClick={() => setEditingAcademic({ id: item.id, course: item.course || "", grade: item.grade || "" })}>
                                        Edit
                                      </button>
                                      <button className="button ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem", color: "var(--error)" }} onClick={() => { if (window.confirm(`Delete "${item.course}"?`)) deleteAcademic(item.id); }}>
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>No subjects added for this year yet.</p>
                          )}

                          <form onSubmit={(e) => addAcademicForYear(yr, e)}>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr) auto", gap: "0.6rem", alignItems: "end" }}>
                              <div className="input" style={{ marginBottom: 0 }}>
                                <label>Subject</label>
                                <SubjectPicker groups={subjectGroups} value={f.course} onChange={(v) => setYearField(yr, "course", v)} />
                              </div>
                              <div className="input" style={{ marginBottom: 0 }}>
                                <label>Grade</label>
                                <input value={f.grade} onChange={(e) => setYearField(yr, "grade", e.target.value)} placeholder="A / 7" />
                              </div>
                              <button className="button" type="submit">Add</button>
                            </div>
                          </form>

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
                    {testAdvisoryLoading ? "Analyzing…" : testAdvisory ? "Re-run MEPAi" : "MEPAi test advisory"}
                  </button>
                )}
              </div>

              <form onSubmit={addTest} style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                  <div className="input" style={{ marginBottom: 0 }}>
                    <label>Test</label>
                    <select value={testForm.test_type} onChange={(e) => setTestForm({ ...testForm, test_type: e.target.value })}>
                      <option value="">—</option>
                      {testForm.test_type && !flatOptions(testGroups).includes(testForm.test_type) && <option value={testForm.test_type}>{testForm.test_type}</option>}
                      <GroupedOptions groups={testGroups} />
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
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      Superscore
                      <InfoTip label="What is a superscore?">
                        Your <strong>superscore</strong> combines your best section scores from different test dates into one total.
                        Example (SAT): Math 750 in March + Reading &amp; Writing 720 in June = superscore 1470.
                        Many US universities accept superscores — check each school's policy. If you took the test once, leave this blank.
                      </InfoTip>
                    </label>
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
                hours per week, MEPAi topic &amp; summary, and an MEPAi score for each activity.
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
                  <label>Description <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(max 250 characters · write on the left, MEPAi guides on the right)</span></label>
                  <MepaiWorkspace
                    heading={awardForm.title ? `Award: ${awardForm.title}` : "Award description"}
                    value={awardForm.description}
                    onChange={(v) => setAwardForm((f) => ({ ...f, description: v }))}
                    placeholder="Recognition, ranking, and what it signals — e.g. Top 5% of 30,000 AMC 10 participants nationwide; qualified for AIME."
                    limit={250}
                    unit="chars"
                    minHeight={360}
                    tipsFn={awardTips}
                    guidanceKind="award_guidance"
                    grammarKind="award_grammar"
                    scope="new"
                    workspace="award"
                    clearKey={awardWsKey}
                    requestGuidance={() => apiFetch("/api/ai/award-guidance", { method: "POST", body: JSON.stringify({ award: awardForm }) })}
                    extraPanel={
                      <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface)", padding: "0.85rem 1rem" }}>
                        <div className="flex-between" style={{ marginBottom: awardEssai ? "0.5rem" : 0, gap: "0.5rem", flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1rem" }}>Need a starting point?</div>
                          <button type="button" className="button gold" style={{ padding: "0.3rem 0.8rem", fontSize: "0.72rem" }} disabled={awardEssaiLoading || !awardForm.title} onClick={runAwardEssai}>
                            {awardEssaiLoading ? "Writing…" : awardEssai ? "New options" : "Write 3 options"}
                          </button>
                        </div>
                        {awardEssai && (
                          <div style={{ display: "grid", gap: "0.45rem" }}>
                            {(awardEssai.suggestions || []).map((sug, i) => (
                              <div key={i} style={{ padding: "0.5rem 0.65rem", background: "var(--paper-warm)", borderRadius: "var(--r-md)", fontSize: "0.84rem", color: "var(--ink-soft)" }}>
                                {sug}
                                <div style={{ textAlign: "right", marginTop: "0.3rem" }}>
                                  <button type="button" className="button ghost" style={{ padding: "0.15rem 0.55rem", fontSize: "0.68rem" }} onClick={() => setAwardForm((f) => ({ ...f, description: sug.slice(0, 250) }))}>Use as a start</button>
                                </div>
                              </div>
                            ))}
                            <p className="text-muted" style={{ fontSize: "0.72rem", margin: 0 }}>Then edit it in your own words — replace any [#] or [brackets] with real details.</p>
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>
                <div className="input">
                  <label>Attachment <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optional — certificate, result letter; PDF, image or doc, max 10MB)</span></label>
                  <label
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", cursor: "pointer",
                      border: "2px dashed var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface)", fontWeight: 400
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={(e) => setAwardFile(e.target.files?.[0] || null)}
                    />
                    <span style={{ fontSize: "1.1rem" }}>📎</span>
                    <span style={{ fontSize: "0.88rem", color: awardFile ? "var(--ink)" : "var(--ink-muted)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {awardFile ? awardFile.name : "Click to attach a file"}
                    </span>
                    {awardFile && (
                      <button type="button" className="button ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.68rem" }} onClick={(e) => { e.preventDefault(); setAwardFile(null); }}>
                        Remove
                      </button>
                    )}
                  </label>
                </div>
                <button className="button" type="submit" disabled={savingAward}>{savingAward ? "Saving…" : "Add award"}</button>
              </form>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                {awards.map((item) => (
                  <div key={item.id} className="card compact" style={{ background: "var(--surface-warm)" }}>
                    <div className="flex-between" style={{ alignItems: "start" }}>
                      <div style={{ flex: 1 }}>
                        <div className="subtitle">{item.title}</div>
                        {item.description && <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.4rem" }}>{item.description}</p>}
                        {item.award_date && <p className="text-muted" style={{ marginTop: "0.4rem" }}>{item.award_date}</p>}
                        {item.attachment_path && (
                          <a href={fileUrl(item.attachment_path)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.4rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--teal-deep)" }}>
                            📎 {item.attachment_name || "Attachment"}
                          </a>
                        )}
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
              <SectionHead num="05" title="Documents" sub="Score reports and portfolio attachments." />

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
                      Open MEPAi →
                    </button>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                  Topic, summary and AI overall score for each essay (up to 5). Full writing, AI feedback and Edit &amp; Apply live in MEPAi.
                </p>
                {essays.length === 0 ? (
                  <p className="muted" style={{ fontSize: "0.85rem" }}>No essays yet. Open MEPAi to start your first one.</p>
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
                {documents.filter((d) => !SECTION_DOC_CATEGORIES.includes(d.category)).length === 0 ? (
                  <p className="muted" style={{ textAlign: "center", padding: "1.5rem" }}>No documents uploaded yet.</p>
                ) : (
                  documents.filter((d) => !SECTION_DOC_CATEGORIES.includes(d.category)).map((doc) => (
                    <div key={doc.id} className="card compact flex-between">
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: "var(--ink)" }}>{doc.original_name || doc.filename || "Document"}</strong>
                        <p className="text-muted" style={{ marginTop: "0.25rem" }}>
                          {doc.category} · {doc.uploaded_at ? fmtDate(doc.uploaded_at) : "—"}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <a
                          href={fileUrl(doc.file_path)}
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
              {/* Section II — Recommendation Letters (MEPAi advisory + timeline) */}
              <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--rule-soft)" }}>
                <div className="flex-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h3 className="subtitle" style={{ marginBottom: 0 }}>Section II · Recommendation Letters</h3>
                  {adviaiOn ? (
                    <button className="button ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem" }} disabled={docAiLoading === "rec"} onClick={runRecAdvisory}>
                      {docAiLoading === "rec" ? "Analyzing…" : recAdvisory ? "Re-run MEPAi" : "MEPAi advisory"}
                    </button>
                  ) : (
                    <Link to="/pricing" className="badge" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem", border: "1px dashed var(--gold)", color: "var(--gold-deep)" }}>MEPAi · Upgrade →</Link>
                  )}
                </div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  Upload teacher/counselor letters here. {adviaiOn ? "Use MEPAi for who to ask and when." : "Upgrade to unlock MEPAi advice on who to ask and when."}
                </p>
                <SectionUpload category="recommendation" hint="Recommendation letter (PDF, image, doc)" documents={documents} onChanged={() => apiFetch("/api/uploads/me").then(setDocuments).catch(() => {})} />
                {adviaiOn && <AdvisoryPanel data={recAdvisory} />}
                <div style={{ marginTop: "0.75rem" }}>
                  <Link to="/essay" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--teal-deep)" }}>Open MEPAi →</Link>
                </div>
              </div>

              {/* Section III — Additional Documents (MEPAi advisory + timeline) */}
              <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--rule-soft)" }}>
                <div className="flex-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h3 className="subtitle" style={{ marginBottom: 0 }}>Section III · Additional Documents</h3>
                  {adviaiOn ? (
                    <button className="button ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem" }} disabled={docAiLoading === "doc"} onClick={runDocAdvisory}>
                      {docAiLoading === "doc" ? "Analyzing…" : docAdvisory ? "Re-run MEPAi" : "MEPAi advisory"}
                    </button>
                  ) : (
                    <Link to="/pricing" className="badge" style={{ padding: "0.4rem 0.9rem", fontSize: "0.72rem", border: "1px dashed var(--gold)", color: "var(--gold-deep)" }}>MEPAi · Upgrade →</Link>
                  )}
                </div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  Portfolios, research abstracts, résumés, or media that reinforce your spike. {!adviaiOn && "Upgrade to unlock MEPAi advice."}
                </p>
                <SectionUpload category="additional" hint="Portfolio, abstract, résumé or media (PDF, image, doc)" documents={documents} onChanged={() => apiFetch("/api/uploads/me").then(setDocuments).catch(() => {})} />
                {adviaiOn && <AdvisoryPanel data={docAdvisory} />}
                <div style={{ marginTop: "0.75rem" }}>
                  <Link to="/essay" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--teal-deep)" }}>Open MEPAi →</Link>
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
        <span>MEPAi</span>
        <span className="badge">Paid</span>
      </div>
      <h4>AI advisory is a paid feature</h4>
      <p style={{ fontSize: "0.9rem" }}>
        Upgrade to <strong>Essential</strong> or <strong>Professional</strong> to unlock <strong>MEPAi</strong> —
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
      <div className="subtitle" style={{ fontSize: "0.95rem" }}>{title} <span className="badge" style={{ fontSize: "0.6rem", marginLeft: "0.3rem" }}>MEPAi</span></div>
      <p className="muted" style={{ fontSize: "0.82rem", margin: "0.4rem 0 0.75rem" }}>{desc}</p>
      {!adviaiOn ? (
        <Link to="/pricing" className="button ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>Upgrade to unlock →</Link>
      ) : !data ? (
        <button type="button" className="button gold" style={{ fontSize: "0.75rem" }} disabled={loading} onClick={run}>
          {loading ? "Analyzing…" : "Get recommendations (MEPAi)"}
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
  React.useEffect(() => {
    if (adviaiOn) loadSaved(["section_advisory"]).then((sv) => setData(sv.section_advisory?.[section] || null));
  }, [section, adviaiOn]);
  if (!adviaiOn) return <AdviAiUpgrade />;
  const run = async () => {
    setLoading(true);
    try {
      setData(await apiFetch("/api/ai/section-advisory", { method: "POST", body: JSON.stringify({ section }) }));
    } catch (err) { alert(err.message || "Could not generate MEPAi advice"); }
    finally { setLoading(false); }
  };
  return (
    <aside className="advisory">
      <div className="advisory-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <span>MEPAi</span>
        <button className="button gold" style={{ padding: "0.3rem 0.85rem", fontSize: "0.7rem" }} disabled={loading} onClick={run}>
          {loading ? "Thinking…" : data ? "Rethink" : "Generate MEPAi advice"}
        </button>
      </div>
      {data ? (
        <>
          {data.stale && (
            <p style={{ fontSize: "0.8rem", color: "var(--warn)", margin: "0 0 0.4rem" }}>
              Your information has changed since this advice was written — press Rethink to update it.
            </p>
          )}
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
          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.35rem" }}>Feedback &amp; suggestions (MEPAi)</div>
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

// Subject: pick from the AP list, or choose "Other" and type any subject
// ---------------- MEPAi Essay workspace (Personal Statement) ----------------
// Left: the student writes and edits. Right: MEPAi only suggests (never rewrites the text).
// The statement, the latest guidance/grammar results and the ticked items are all saved to the account.

// Instant, free writing tips while typing (no AI call)
const WEAK_PHRASES = [
  [/\bexpress(?:ing)? my (?:profound |deep )?interest\b/i, "Use a stronger verb than “express my interest” — show what you want to do there."],
  [/\bI am (?:very |really )?passionate about\b/i, "Instead of saying you're passionate, show it with one specific moment."],
  [/\b(?:ever )?since I was (?:young|a (?:child|kid))\b/i, "“Since I was young” is a cliché — start from a concrete, recent moment."],
  [/\bmy background\b/i, "Consider “a unique perspective” or name the experience instead of “background”."],
  [/\b(?:very|really|extremely)\s+\w+/i, "Cut intensifiers like “very/really” — pick one precise word."],
  [/\b(?:a lot of|lots of|things|stuff)\b/i, "Replace vague words (“a lot”, “things”, “stuff”) with specifics."],
  [/\bI (?:think|believe|feel) that\b/i, "Drop “I think/believe that” — state the point directly."],
  [/\bin conclusion\b/i, "Avoid “In conclusion” — end on a forward-looking image or insight."],
  [/\b(?:help(?:ing)? people|make a difference|change the world)\b/i, "“Help people / make a difference” is generic — say who, how, and what changed."]
];
const STOP = new Set("the a an and or but of to in on for with at by from as is are was were be been it this that my me i we our you your they their he she his her them so not no do did have has had can will would could should which who what when where how than then also just about into over".split(" "));

function realtimeTips(text, limit) {
  const t = (text || "").trim();
  if (!t) return ["Start with a vivid moment — a scene, a problem, or a question — not an introduction."];
  const tips = [];
  const words = t.split(/\s+/);
  const wc = words.length;
  if (/^(?:my name is|i am|i'm|hello|hi)\b/i.test(t)) tips.push("Open with a vivid moment instead of introducing yourself.");
  if (wc < Math.round(limit * 0.6)) tips.push(`You have ${wc} words — aim for ${Math.round(limit * 0.8)}–${limit} to tell a full story.`);
  if (wc > limit) tips.push(`You're ${wc - limit} words over the ${limit}-word limit — trim repetition first.`);
  for (const [re, tip] of WEAK_PHRASES) if (re.test(t)) tips.push(tip);
  const longSentence = t.split(/(?<=[.!?])\s+/).find((sn) => sn.split(/\s+/).length > 35);
  if (longSentence) tips.push(`Split the long sentence starting “${longSentence.split(/\s+/).slice(0, 6).join(" ")}…”.`);
  if (wc > 150 && !/\n\s*\n|\n/.test(t)) tips.push("Break it into paragraphs: hook → story → reflection → what's next.");
  if (wc > 120 && !/\d/.test(t)) tips.push("Add one concrete detail — a number, a name, or a place.");
  const iStarts = t.split(/(?<=[.!?])\s+/).filter((sn) => /^I\b/.test(sn)).length;
  if (iStarts >= 4) tips.push("Many sentences start with “I” — vary the openings.");
  const counts = {};
  words.map((w) => w.toLowerCase().replace(/[^a-z']/g, "")).filter((w) => w.length > 3 && !STOP.has(w)).forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
  const rep = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  if (rep && rep[1] >= 5) tips.push(`“${rep[0]}” appears ${rep[1]} times — find a synonym for a few.`);
  return tips.slice(0, 6);
}


function MepaiStatementWorkspace({ value, onChange, target, loaded }) {
  const [saved, setSaved] = useState(null); // text as last saved (to show unsaved changes)
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ text: "", error: false });
  // the statement loaded from the account counts as "saved"
  useEffect(() => { if (loaded && saved === null) setSaved(value || ""); }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = saved !== null && (value || "") !== saved;
  const save = async () => {
    setSaving(true); setSaveMsg({ text: "", error: false });
    try {
      const r = await apiFetch("/api/students/me/statement", { method: "PUT", body: JSON.stringify({ bio: value || "" }) });
      setSaved(value || ""); setSavedAt(r.saved_at);
      setSaveMsg({ text: "Saved — it will be here next time you open this page.", error: false });
    } catch (e) { setSaveMsg({ text: e.message, error: true }); } finally { setSaving(false); }
  };
  return (
    <div style={{ margin: "1.5rem 0" }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", color: "var(--ink)", marginBottom: "0.6rem" }}>
        Personal Statement <span className="text-muted" style={{ fontWeight: 400 }}>(max {STATEMENT_WORD_LIMIT} words) · write on the left, MEPAi guides on the right</span>
      </label>
      <MepaiWorkspace
        heading={`Personal Statement Draft${target ? `: ${target} Application` : ""}`}
        value={value}
        onChange={onChange}
        placeholder="Start with a moment that matters to you — what happened, what you did, and what it taught you…"
        limit={STATEMENT_WORD_LIMIT}
        unit="words"
        tipsFn={realtimeTips}
        guidanceKind="statement_guidance"
        grammarKind="statement_grammar"
        workspace="statement"
        requestGuidance={() => apiFetch("/api/ai/statement-guidance", { method: "POST", body: JSON.stringify({ text: value, target }) })}
        statusText={
          <span style={{ fontSize: "0.78rem", color: dirty ? "var(--warn)" : "var(--ink-muted)" }}>
            {dirty ? "● Unsaved changes" : savedAt ? `Saved ${fmtTime(savedAt)}` : saved ? "Saved" : ""}
          </span>
        }
        saveButton={{ label: dirty ? "Save" : "Saved ✓", disabled: !dirty, busy: saving, onClick: save }}
      />
      {saveMsg.text && <p style={{ fontSize: "0.82rem", margin: "0.5rem 0 0", color: saveMsg.error ? "var(--error)" : "var(--success)" }}>{saveMsg.text}</p>}
    </div>
  );
}

// Documents → Section II / III each keep their own uploads (by document category)
const SECTION_DOC_CATEGORIES = ["recommendation", "additional"];

function SectionUpload({ category, hint, documents, onChanged }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef(null);
  const mine = documents.filter((d) => d.category === category);

  const upload = async () => {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      await apiUpload("/api/uploads/me", fd);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onChanged();
    } catch (err) { setMsg(`Upload failed: ${err.message}`); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try { await apiFetch(`/api/uploads/me/${id}`, { method: "DELETE" }); await onChanged(); }
    catch (err) { setMsg(err.message); }
  };

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "stretch", flexWrap: "wrap" }}>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); }}
          style={{
            flex: "1 1 260px", minWidth: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.65rem",
            padding: "0.75rem 1rem", borderRadius: "var(--r-md)", transition: "all 0.15s ease",
            border: `2px dashed ${drag ? "var(--gold-deep)" : "var(--rule)"}`,
            background: drag ? "var(--surface-warm)" : "var(--surface)"
          }}
        >
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <span style={{ color: "var(--gold-deep)", fontSize: "1.05rem" }}>⬆</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {file ? file.name : "Click to choose a file"}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--ink-muted)" }}>
              {file ? `${(file.size / 1024).toFixed(0)} KB · click to change` : `or drag & drop — ${hint}`}
            </div>
          </div>
        </div>
        <button type="button" className="button" disabled={!file || busy} onClick={upload}>{busy ? "Uploading…" : "Upload"}</button>
      </div>
      {msg && <p style={{ fontSize: "0.82rem", color: "var(--error)", margin: "0.4rem 0 0" }}>{msg}</p>}
      {mine.length > 0 && (
        <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.75rem" }}>
          {mine.map((doc) => (
            <div key={doc.id} className="card compact flex-between" style={{ padding: "0.6rem 0.9rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: "var(--ink)", fontSize: "0.88rem" }}>{doc.original_name || "Document"}</strong>
                <div className="text-muted" style={{ fontSize: "0.74rem" }}>{doc.uploaded_at ? fmtDate(doc.uploaded_at) : ""}</div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <a href={fileUrl(doc.file_path)} target="_blank" rel="noopener noreferrer" className="button ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.7rem" }}>View</a>
                <button type="button" className="button ghost" onClick={() => remove(doc.id)} style={{ padding: "0.3rem 0.7rem", fontSize: "0.7rem", color: "var(--error)", borderColor: "var(--error)" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Instant tips for an award description (no AI call)
function awardTips(text) {
  const t = (text || "").trim();
  if (!t) return ["Say the level (school, regional, national, international) and how selective it was."];
  const tips = [];
  if (!/\b(?:school|district|state|regional|provincial|national|international|global|world)\b/i.test(t)) tips.push("State the level: school, regional, national or international.");
  if (!/\d/.test(t)) tips.push("Add selectivity with a number: top 5%, 1 of 12 winners, out of 30,000 entrants.");
  if (/\bI\b/.test(t)) tips.push("Drop “I” — keep it a short, factual line.");
  if (/\b(?:very|really|amazing|prestigious|great)\b/i.test(t)) tips.push("Let the facts show prestige — cut words like “prestigious” or “amazing”.");
  if (t.length < 80) tips.push(`${t.length}/250 characters — add what this award says about your skills or spike.`);
  return tips.slice(0, 5);
}

// Small (i) button that shows a short explanation on hover, focus or tap
function InfoTip({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = React.useId();
  return (
    <span style={{ position: "relative", display: "inline-flex" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{ width: 17, height: 17, borderRadius: "50%", border: "1px solid var(--ink-muted)", background: "var(--surface)", color: "var(--ink-muted)", fontSize: "0.68rem", fontWeight: 700, fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1, padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30, width: 280, maxWidth: "80vw", padding: "0.7rem 0.85rem", background: "var(--ink)", color: "#fff", borderRadius: "var(--r-md)", fontSize: "0.78rem", fontWeight: 400, lineHeight: 1.5, textTransform: "none", letterSpacing: 0, boxShadow: "var(--shadow-md)" }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

function SubjectPicker({ groups, value, onChange }) {
  const all = flatOptions(groups);
  const listed = all.includes(value);
  const [custom, setCustom] = useState(!!value && !listed);
  // Open the text box for an unlisted saved value; never auto-close it (clearing the text while typing is fine)
  useEffect(() => { if (value && !all.includes(value)) setCustom(true); }, [value, groups]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <select
        value={custom ? "__other" : (listed ? value : "")}
        onChange={(e) => {
          // Keep the current text so the effect below doesn't see "" and close the custom box
          if (e.target.value === "__other") setCustom(true);
          else { setCustom(false); onChange(e.target.value); }
        }}
      >
        <option value="">— Select a subject —</option>
        <GroupedOptions groups={groups} />
        <option value="__other">Other — type a subject…</option>
      </select>
      {custom && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Mathematics, IB Physics HL" autoFocus />
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
