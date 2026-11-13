import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import Skeleton, { EmptyState } from "../components/Skeleton.jsx";
import { Icon } from "../components/marketing.jsx";
import { fmtDate } from "../utils/date.js";

// Counsellor workspace — what the public pages promise counsellors:
//   Support every student, consistently   → cohort table, filters, next step per student
//   Track progress across your cohort     → progress, last active, "needs attention" flags
//   One platform, all the documentation   → deadlines across the cohort, recommendation requests

const FLAG_STYLE = {
  high: { bg: "var(--error-soft)", fg: "var(--error-deep)" },
  medium: { bg: "#fef3c7", fg: "#92400e" },
  low: { bg: "rgba(31,52,97,0.08)", fg: "var(--navy)" },
  info: { bg: "var(--teal-soft)", fg: "var(--teal-deep)" }
};
const REC_STATUS = {
  requested: { label: "New request", bg: "#fef3c7", fg: "#92400e" },
  in_progress: { label: "Writing", bg: "rgba(31,52,97,0.08)", fg: "var(--navy)" },
  sent: { label: "Sent", bg: "var(--success-soft)", fg: "var(--success-deep)" },
  declined: { label: "Declined", bg: "#e5e7eb", fg: "#374151" }
};
const ago = (d) => {
  if (d === null || d === undefined) return "Not yet";
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  const m = Math.round(d / 30);
  return `${m} month${m > 1 ? "s" : ""} ago`;
};
const daysUntil = (date) => Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);

function Chip({ f }) {
  const st = FLAG_STYLE[f.level] || FLAG_STYLE.low;
  return <span className="cs-chip" style={{ background: st.bg, color: st.fg }}>{f.label}</span>;
}

export default function CounselorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState(null);
  const [recs, setRecs] = useState([]);
  const [tab, setTab] = useState("cohort");
  const [filter, setFilter] = useState("all");
  const [grade, setGrade] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "attention", dir: 1 });
  const [inviteCode, setInviteCode] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  const loadAll = async () => {
    const [u, s, r] = await Promise.all([
      apiFetch("/api/auth/me").catch(() => null),
      apiFetch("/api/counselors/me/students").catch(() => []),
      apiFetch("/api/counselors/me/recommendations").catch(() => [])
    ]);
    setUser(u); setStudents(s || []); setRecs(r || []);
  };
  useEffect(() => { loadAll(); }, []);

  const link = async () => {
    if (!inviteCode.trim()) return;
    setStatus({ text: "Linking…", error: false });
    try {
      await apiFetch("/api/counselors/me/link", { method: "POST", body: JSON.stringify({ invite_code: inviteCode.trim() }) });
      setInviteCode(""); setShowLink(false);
      setStatus({ text: "Student added.", error: false });
      loadAll();
      setTimeout(() => setStatus({ text: "", error: false }), 3500);
    } catch (e) { setStatus({ text: e.message, error: true }); }
  };
  const unlink = async (s) => {
    if (!window.confirm(`Stop advising ${s.name}? You'll no longer see their portfolio.`)) return;
    await apiFetch(`/api/counselors/me/students/${s.student_id}`, { method: "DELETE" });
    loadAll();
  };
  const setRec = async (id, patch) => {
    try { await apiFetch(`/api/counselors/me/recommendations/${id}`, { method: "PUT", body: JSON.stringify(patch) }); loadAll(); }
    catch (e) { setStatus({ text: e.message, error: true }); }
  };

  const list = students || [];
  const grades = [...new Set(list.map((s) => s.grade_level).filter(Boolean))].sort();
  const attention = list.filter((s) => s.needs_attention);
  const avg = list.length ? Math.round(list.reduce((a, s) => a + (s.completion || 0), 0) / list.length) : 0;
  const openRecs = recs.filter((r) => r.status === "requested" || r.status === "in_progress");

  const rows = useMemo(() => {
    let r = list;
    if (filter === "attention") r = r.filter((s) => s.needs_attention);
    if (filter === "overdue") r = r.filter((s) => s.overdue > 0);
    if (filter === "inactive") r = r.filter((s) => s.flags.some((f) => f.key === "inactive"));
    if (filter === "letters") r = r.filter((s) => s.open_recommendations > 0);
    if (grade) r = r.filter((s) => s.grade_level === grade);
    if (q.trim()) { const t = q.trim().toLowerCase(); r = r.filter((s) => [s.name, s.email, s.school, s.intended_major].some((x) => (x || "").toLowerCase().includes(t))); }
    const val = {
      attention: (s) => -(s.flags.filter((f) => f.level === "high").length * 10 + s.flags.filter((f) => f.level === "medium").length),
      name: (s) => (s.name || "").toLowerCase(),
      completion: (s) => s.completion,
      active: (s) => (s.days_inactive ?? 99999),
      deadline: (s) => (s.next_deadline ? new Date(s.next_deadline.date).getTime() : Infinity)
    }[sort.key];
    return [...r].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [list, filter, grade, q, sort]);

  const cohortDeadlines = list
    .flatMap((s) => (s.upcoming || []).map((d) => ({ ...d, student: s })))
    .filter((d) => daysUntil(d.date) <= 60)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const SortTh = ({ k, children }) => (
    <th scope="col" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="cs-sort" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : 1 }))}>
        {children} {sort.key === k ? (sort.dir === 1 ? "▲" : "▼") : ""}
      </button>
    </th>
  );

  if (students === null) return <div style={{ display: "grid", gap: "1.5rem" }}><Skeleton lines={3} /><Skeleton lines={6} /></div>;

  return (
    <div className="cs-page">
      <header className="cs-header">
        <div>
          <div className="eyebrow">Counsellor workspace</div>
          <h1>Welcome, {user?.name || "Counsellor"}.</h1>
          <p className="lede">
            {list.length === 0 ? "Add your first student to start tracking their progress."
              : attention.length ? (list.length === 1 ? <>Your student needs attention today.</> : <>{attention.length} of your {list.length} students need attention today.</>)
              : list.length === 1 ? <>Your student is on track.</> : <>All {list.length} students are on track.</>}
          </p>
        </div>
        <button className="button gold" onClick={() => setShowLink((v) => !v)}>{showLink ? "Cancel" : "+ Add student"}</button>
      </header>

      {status.text && <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: status.error ? "var(--error-deep)" : "var(--success-deep)" }}>{status.text}</p>}

      {showLink && (
        <div className="card cs-link">
          <div>
            <h2 className="subtitle" style={{ margin: 0 }}>Add a student</h2>
            <p className="muted" style={{ fontSize: "0.86rem", margin: "0.3rem 0 0" }}>The student finds their invite code in Portfolio → “Parent invite code” (the same code works for counsellors).</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); link(); }} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input aria-label="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="12-character code" className="mono" style={{ letterSpacing: "0.12em", flex: "1 1 200px" }} />
            <button className="button" disabled={!inviteCode.trim()}>Add</button>
          </form>
        </div>
      )}

      <section className="cs-kpis" aria-label="Cohort summary">
        <button type="button" className={`cs-kpi${tab === "cohort" && filter === "all" ? " on" : ""}`} onClick={() => { setTab("cohort"); setFilter("all"); }}>
          <span className="mk-icon"><Icon name="cohort" size={24} /></span><strong>{list.length}</strong><span>{list.length === 1 ? "Student" : "Students"}</span>
        </button>
        <div className="cs-kpi">
          <span className="mk-icon"><Icon name="stand" size={24} /></span><strong>{avg}%</strong><span>Average portfolio</span>
          <div className="progress" style={{ marginTop: "0.4rem" }}><span style={{ width: `${avg}%` }} /></div>
        </div>
        <button type="button" className={`cs-kpi warn${tab === "cohort" && filter === "attention" ? " on" : ""}`} onClick={() => { setTab("cohort"); setFilter("attention"); }}>
          <span className="mk-icon"><Icon name="bell" size={24} /></span><strong>{attention.length}</strong><span>Need attention</span>
        </button>
        <button type="button" className={`cs-kpi${tab === "letters" ? " on" : ""}`} onClick={() => setTab("letters")}>
          <span className="mk-icon"><Icon name="essay" size={24} /></span><strong>{openRecs.length}</strong><span>Letter requests open</span>
        </button>
      </section>

      <div className="mk-pills" role="tablist" aria-label="Views" style={{ justifyContent: "flex-start" }}>
        {[["cohort", "Cohort"], ["deadlines", `Deadlines${cohortDeadlines.length ? ` (${cohortDeadlines.length})` : ""}`], ["letters", `Recommendation letters${openRecs.length ? ` (${openRecs.length})` : ""}`]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`mk-pill${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState title="No students yet." hint="Use “+ Add student” with the student's invite code to start tracking their progress." />
      ) : tab === "cohort" ? (
        <section className="card cs-card">
          <div className="cs-toolbar">
            <div className="cs-filters" role="group" aria-label="Show">
              {[["all", "All"], ["attention", "Needs attention"], ["overdue", "Overdue tasks"], ["inactive", "Inactive"], ["letters", "Letter requests"]].map(([k, l]) => (
                <button key={k} type="button" aria-pressed={filter === k} className={`cs-filter${filter === k ? " on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {grades.length > 1 && (
                <select aria-label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="cs-input">
                  <option value="">All grades</option>
                  {grades.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              <input aria-label="Search students" className="cs-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, school, major…" />
            </div>
          </div>
          {rows.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No students match.</p> : (<>
            {/* Phones: one card per student, everything visible without sideways scrolling */}
            <ul className="cs-cards" aria-label="Students">
              {rows.map((s) => (
                <li key={s.student_id}>
                  <button type="button" className="cs-name" onClick={() => navigate(`/counselor/student/${s.student_id}`)}>
                    <span className="cs-avatar" aria-hidden="true">{(s.name || "S").charAt(0).toUpperCase()}</span>
                    <span><strong>{s.name}</strong><small>{[s.grade_level, s.school].filter(Boolean).join(" · ") || "No grade or school yet"}</small></span>
                  </button>
                  <div className="flex-between" style={{ fontSize: "0.8rem", margin: "0.75rem 0 0.25rem" }}>
                    <span className="text-muted">Portfolio · {s.counts.universities} unis · {s.counts.essays} essays</span><strong>{s.completion}%</strong>
                  </div>
                  <div className="progress"><span style={{ width: `${s.completion}%` }} /></div>
                  <dl className="cs-facts">
                    <div><dt>Last active</dt><dd style={{ color: s.days_inactive === null || s.days_inactive >= 14 ? "#92400e" : undefined }}>{ago(s.days_inactive)}</dd></div>
                    <div><dt>Next deadline</dt><dd>{s.next_deadline ? <>{s.next_deadline.title}<small> · {fmtDate(s.next_deadline.date)}</small></> : "—"}</dd></div>
                  </dl>
                  {s.flags.length ? <div className="cs-chips">{s.flags.map((f) => <Chip key={f.key} f={f} />)}</div> : <span className="cs-ok">On track</span>}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.8rem" }}>
                    <button type="button" className="button cs-mini" onClick={() => navigate(`/counselor/student/${s.student_id}`)}>Open portfolio</button>
                    <button type="button" className="cs-unlink" onClick={() => unlink(s)} aria-label={`Stop advising ${s.name}`}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="table-scroll cs-table-wrap" tabIndex={0} role="region" aria-label="Students">
              <table className="cs-table">
                <thead>
                  <tr>
                    <SortTh k="name">Student</SortTh>
                    <SortTh k="completion">Portfolio</SortTh>
                    <SortTh k="active">Last active</SortTh>
                    <SortTh k="deadline">Next deadline</SortTh>
                    <SortTh k="attention">Needs attention</SortTh>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.student_id}>
                      <th scope="row">
                        <button type="button" className="cs-name" onClick={() => navigate(`/counselor/student/${s.student_id}`)}>
                          <span className="cs-avatar" aria-hidden="true">{(s.name || "S").charAt(0).toUpperCase()}</span>
                          <span><strong>{s.name}</strong><small>{[s.grade_level, s.school].filter(Boolean).join(" · ") || "No grade or school yet"}</small></span>
                        </button>
                      </th>
                      <td style={{ minWidth: 140 }}>
                        <div className="flex-between" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}><span className="text-muted">{s.counts.universities} unis · {s.counts.essays} essays</span><strong>{s.completion}%</strong></div>
                        <div className="progress"><span style={{ width: `${s.completion}%` }} /></div>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: s.days_inactive === null || s.days_inactive >= 14 ? "#92400e" : "var(--ink-soft)" }}>{ago(s.days_inactive)}</td>
                      <td>
                        {s.next_deadline ? (
                          <><div style={{ fontSize: "0.85rem", color: "var(--ink)" }}>{s.next_deadline.title}</div><small className="text-muted">{fmtDate(s.next_deadline.date)} · {daysUntil(s.next_deadline.date) === 0 ? "today" : `in ${daysUntil(s.next_deadline.date)} days`}</small></>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>{s.flags.length ? <div className="cs-chips">{s.flags.map((f) => <Chip key={f.key} f={f} />)}</div> : <span className="cs-ok">On track</span>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" className="button ghost cs-mini" onClick={() => navigate(`/counselor/student/${s.student_id}`)}>Open</button>
                        <button type="button" className="cs-unlink" onClick={() => unlink(s)} aria-label={`Stop advising ${s.name}`}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}
        </section>
      ) : tab === "deadlines" ? (
        <section className="card cs-card">
          <h2 className="section-title" style={{ fontSize: "1.15rem" }}>Next 60 days across your cohort</h2>
          {cohortDeadlines.length === 0 ? <p className="muted" style={{ margin: 0 }}>No deadlines in the next 60 days. Students add them in Tasks and on their university list.</p> : (
            <ol className="cs-timeline">
              {cohortDeadlines.map((d, i) => {
                const n = daysUntil(d.date);
                return (
                  <li key={i} className={n <= 7 ? "soon" : ""}>
                    <div className="cs-date"><strong>{new Date(d.date).getDate()}</strong><span>{new Date(d.date).toLocaleString("en", { month: "short" })}</span></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "var(--ink)", fontWeight: 600 }}>{d.title}</div>
                      <small className="text-muted">{d.kind === "university" ? "Application deadline" : "Task"} · <button type="button" className="cs-link-btn" onClick={() => navigate(`/counselor/student/${d.student.student_id}`)}>{d.student.name}</button></small>
                    </div>
                    <span className="cs-chip" style={n <= 7 ? { background: "var(--error-soft)", color: "var(--error-deep)" } : { background: "var(--surface-warm, #f1f5f9)", color: "var(--ink-soft)" }}>{n === 0 ? "Today" : `${n} days`}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : (
        <section className="card cs-card">
          <h2 className="section-title" style={{ fontSize: "1.15rem" }}>Recommendation letters</h2>
          <p className="muted" style={{ fontSize: "0.86rem", marginTop: 0 }}>Students ask for a letter from their Portfolio → Documents. Update the status here — they see it straight away.</p>
          {recs.length === 0 ? <p className="muted" style={{ margin: 0 }}>No requests yet.</p> : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {recs.map((r) => <RecCard key={r.id} r={r} onSet={setRec} onOpen={() => navigate(`/counselor/student/${r.student_id}`)} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function RecCard({ r, onSet, onOpen }) {
  const [note, setNote] = useState(r.counselor_note || "");
  const st = REC_STATUS[r.status] || REC_STATUS.requested;
  const due = r.due_date ? daysUntil(r.due_date) : null;
  return (
    <article className="cs-rec">
      <div className="flex-between" style={{ gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "var(--ink)" }}>{r.purpose}</div>
          <small className="text-muted">
            {onOpen ? <button type="button" className="cs-link-btn" onClick={onOpen}>{r.student_name}</button> : r.student_name}
            {" · asked "}{fmtDate(r.created_at)}
            {r.due_date && <> · due <strong style={{ color: due !== null && due <= 7 && ["requested", "in_progress"].includes(r.status) ? "var(--error-deep)" : "inherit" }}>{fmtDate(r.due_date)}</strong></>}
          </small>
        </div>
        <span className="cs-chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
      </div>
      {r.student_note && <p className="cs-quote">“{r.student_note}”</p>}
      <div className="cs-rec-actions">
        {r.status === "requested" && <button type="button" className="button cs-mini" onClick={() => onSet(r.id, { status: "in_progress" })}>Start writing</button>}
        {["requested", "in_progress"].includes(r.status) && <button type="button" className="button cs-mini" onClick={() => onSet(r.id, { status: "sent" })}>Mark as sent</button>}
        {r.status === "requested" && <button type="button" className="button ghost cs-mini" onClick={() => onSet(r.id, { status: "declined" })}>Decline</button>}
        {["sent", "declined"].includes(r.status) && <button type="button" className="button ghost cs-mini" onClick={() => onSet(r.id, { status: "in_progress" })}>Reopen</button>}
        <input aria-label="Note to the student" className="cs-input" style={{ flex: "1 1 220px" }} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (r.counselor_note || "") && onSet(r.id, { counselor_note: note })} placeholder="Note to the student (optional)" />
      </div>
    </article>
  );
}
