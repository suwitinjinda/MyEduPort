import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

// Phone screens from Figma "Concept A — Calm Coach":
//   MobileHomeTop          Home — greeting, MEPAi score card, "Your next step", two small tiles
//   MobilePortfolioOverview Portfolio — the five sections at a glance with their status

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
};
const daysUntil = (d) => Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
const firstSentence = (t) => (String(t || "").match(/^.*?[.!?](\s|$)/)?.[0] || String(t || "")).trim();

// The single most useful thing to do next, from what's already on the dashboard
export function pickNextStep({ profile, tasks = [], essays = [], activities = [], gap = [] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < today);
  if (overdue.length) return { title: `Catch up: ${overdue[0].title}`, sub: `${overdue.length} task${overdue.length > 1 ? "s" : ""} overdue`, cta: "Open tasks", to: "/tasks", tone: "warn" };
  const missing = ["grade_level", "school", "target_countries", "intended_major"].filter((k) => !profile?.[k]);
  if (missing.length) return { title: "Finish your personal details", sub: `${4 - missing.length} of 4 basics filled in`, pct: ((4 - missing.length) / 4) * 100, cta: "Continue", to: "/profile?section=personal" };
  const draft = essays.find((e) => (e.word_count || 0) > 0 && (e.word_count || 0) < 500);
  if (draft) return { title: `Finish “${draft.title || "your essay"}”`, sub: `${draft.word_count} / 650 words`, pct: Math.min(100, (draft.word_count / 650) * 100), cta: "Continue writing", to: `/profile?section=documents&essay=${draft.id}` };
  if (activities.length < 4) return { title: "Add your activities", sub: `${activities.length} of 4 recommended`, pct: (activities.length / 4) * 100, cta: "Add an activity", to: "/profile?section=extracurriculars" };
  const g = Array.isArray(gap) ? gap[0] : null;
  const gapText = g && (typeof g === "string" ? g : g.action || g.title || g.recommendation);
  if (gapText) return { title: firstSentence(gapText), sub: "MEPAi's top suggestion", cta: "See next steps", to: "/dashboard#next-steps" };
  if (!essays.length) return { title: "Start your personal statement", sub: "A first draft is the hardest part", cta: "Start writing", to: "/profile?section=documents&essay=new" };
  return { title: "Review your university list", sub: "Check your reach, target and safety balance", cta: "Open universities", to: "/recommendations" };
}

export function MobileHomeTop({ name, score, completion, aiLoading, next, tasks = [], savedUnis = [] }) {
  const navigate = useNavigate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadlines = [
    ...tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) >= today).map((t) => ({ title: t.title, date: t.due_date })),
    ...savedUnis.filter((u) => u.deadline && new Date(u.deadline) >= today).map((u) => ({ title: u.name, date: u.deadline }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  const nd = deadlines[0];
  const buckets = ["reach", "target", "safety"].map((b) => [b, savedUnis.filter((u) => u.bucket === b).length]).filter(([, n]) => n);
  const value = score?.overall ?? (aiLoading ? null : completion);
  const line = score?.summary ? firstSentence(score.summary) : aiLoading ? "MEPAi is reading your portfolio…" : `Your portfolio is ${completion}% complete.`;

  return (
    <div className="m-home">
      <div className="m-hello"><span>{greeting()}</span><h1>{name}</h1></div>

      <Link to="/dashboard#score" className="m-score" aria-label={`MEPAi portfolio score ${value ?? "loading"} out of 100`}>
        <div className="m-ring" style={{ "--p": value ?? 0 }}><strong>{value ?? "…"}</strong><small>/ 100</small></div>
        <div><div className="m-kicker">MEPAi portfolio score</div><div className="m-score-line">{line}</div></div>
      </Link>

      <div className="m-kicker m-section">Your next step</div>
      <div className={`m-next${next.tone === "warn" ? " warn" : ""}`}>
        <strong>{next.title}</strong>
        <span>{next.sub}</span>
        {next.pct !== undefined && <div className="m-bar"><i style={{ width: `${Math.max(4, Math.round(next.pct))}%` }} /></div>}
        <button type="button" className="button m-cta" onClick={() => navigate(next.to)}>{next.cta}</button>
      </div>

      <div className="m-tiles">
        <Link to="/tasks" className="m-tile">
          <span>Next deadline</span>
          {nd ? <><strong className={daysUntil(nd.date) <= 14 ? "hot" : ""}>{daysUntil(nd.date) === 0 ? "Today" : `${daysUntil(nd.date)} days`}</strong><small>{nd.title} · {fmtDate(nd.date)}</small></>
            : <><strong>None yet</strong><small>Add one in Tasks</small></>}
        </Link>
        <Link to="/recommendations" className="m-tile">
          <span>College list</span>
          <strong>{savedUnis.length} school{savedUnis.length === 1 ? "" : "s"}</strong>
          <small>{buckets.length ? buckets.map(([b, n]) => `${n} ${b}`).join(" · ") : "Start your shortlist"}</small>
        </Link>
      </div>
      <div className="m-kicker m-section" style={{ marginTop: "0.5rem" }}>More on your dashboard</div>
    </div>
  );
}

const STATUS = { done: ["Done", "m-done"], going: ["On going", "m-going"], empty: ["Not started", "m-empty"] };

export function MobilePortfolioOverview() {
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [tip, setTip] = useState("");
  useEffect(() => {
    apiFetch("/api/students/me/summary").then(setS).catch(() => setS({ completion: 0, counts: {}, profile: {} }));
    apiFetch("/api/ai/score").then((r) => setTip(r?.weaknesses?.[0] || r?.summary || "")).catch(() => {});
  }, []);
  if (!s) return <p className="muted">Loading…</p>;
  const c = s.counts || {}, p = s.profile || {};
  const filled = ["grade_level", "school", "target_countries", "intended_major"].filter((k) => p[k]).length;
  const st = (done, any) => (done ? "done" : any ? "going" : "empty");
  const sections = [
    { id: "personal", title: "Personal", sub: [p.target_countries, p.intended_major].filter(Boolean).join(" · ") || "Countries, majors, statement", status: st(filled === 4 && p.has_statement, filled > 0 || p.has_statement) },
    { id: "academics", title: "Academics", sub: [p.curriculum, c.academics ? `${c.academics} subjects` : "", c.tests ? `${c.tests} tests` : ""].filter(Boolean).join(" · ") || "Curriculum, grades, tests", status: st(c.academics >= 4 && c.tests >= 1, c.academics || c.tests) },
    { id: "extracurriculars", title: "Extracurricular", sub: c.activities ? `${c.activities} activit${c.activities === 1 ? "y" : "ies"}` : "Clubs, sport, volunteering, projects", status: st(c.activities >= 4, c.activities) },
    { id: "awards", title: "Awards", sub: c.awards ? `${c.awards} award${c.awards === 1 ? "" : "s"}` : "Competitions, honours, certificates", status: st(c.awards >= 2, c.awards) },
    { id: "documents", title: "Documents & essays", sub: `${c.essays || 0} essay${c.essays === 1 ? "" : "s"} · ${c.letters || 0} letter${c.letters === 1 ? "" : "s"}`, status: st(c.essays >= 1 && c.letters >= 1, c.essays || c.documents) }
  ];
  return (
    <div className="m-port">
      <h1>Portfolio</h1>
      <p>{s.completion}% complete · tap a section to edit</p>
      <div className="m-bar big"><i style={{ width: `${Math.max(2, s.completion)}%` }} /></div>
      <ul>
        {sections.map((x, i) => {
          const [label, cls] = STATUS[x.status];
          return (
            <li key={x.id}>
              <button type="button" onClick={() => navigate(`/profile?section=${x.id}`)}>
                <span className="m-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="m-sec"><strong>{x.title}</strong><small>{x.sub}</small></span>
                <span className={`m-status ${cls}`}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {tip && <div className="m-tip"><div className="m-kicker">MEPAi tip</div><p>{tip}</p></div>}
    </div>
  );
}
