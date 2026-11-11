import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

// Parent Dashboard: each linked child's progress, what they've done lately, upcoming
// deadlines, and — for children under 20 — the privacy choices the parent gave at consent,
// which they can change or withdraw here (MyEduPort_Consent_Form_202611.docx).

const KIND_ICON = { activity: "★", award: "◆", essay: "✎", academic: "A", test: "T", document: "▤", deadline: "⏰" };

function ChildCard({ s, onChanged }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState("");
  const [msg, setMsg] = useState({ text: "", error: false });
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const first = (s.name || "").split(/\s+/)[0];

  const setConsent = async (key, granted) => {
    setSaving(key); setMsg({ text: "", error: false });
    try {
      await apiFetch(`/api/parents/me/students/${s.student_id}/consents/${key}`, { method: "PUT", body: JSON.stringify({ granted }) });
      onChanged();
      setMsg({ text: "Saved.", error: false });
    } catch (e) { setMsg({ text: e.message, error: true }); } finally { setSaving(""); }
  };
  const withdraw = async () => {
    setSaving("withdraw"); setMsg({ text: "", error: false });
    try {
      await apiFetch(`/api/parents/me/students/${s.student_id}/withdraw`, { method: "POST", body: JSON.stringify({ confirm: confirmName }) });
      onChanged();
    } catch (e) { setMsg({ text: e.message, error: true }); setSaving(""); }
  };

  const statusBadge = !s.minor ? null
    : s.parent_consent_status === "confirmed" ? <span className="badge" style={{ background: "var(--success-soft)", color: "var(--success-deep)" }}>Consent given</span>
    : <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>Waiting for consent</span>;

  return (
    <article className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
        <div aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #1f3461, #0f766e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.3rem", flexShrink: 0 }}>
          {s.name?.charAt(0)?.toUpperCase() || "S"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)" }}>{s.name}</div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>{[s.grade_level, s.school].filter(Boolean).join(" · ") || "Student"}</div>
        </div>
        {statusBadge}
      </div>

      <div style={{ marginTop: "1.1rem" }}>
        <div className="flex-between" style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginBottom: "0.35rem" }}>
          <span>Portfolio complete</span><strong style={{ color: "var(--ink)" }}>{s.completion ?? 0}%</strong>
        </div>
        <div className="progress"><span style={{ width: `${s.completion ?? 0}%` }} /></div>
        {(s.target_countries || s.intended_major) && (
          <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>{[s.intended_major, s.target_countries].filter(Boolean).join(" · ")}</div>
        )}
      </div>

      <div style={{ marginTop: "1.1rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: "0.4rem" }}>Recent activity</div>
        {s.recent?.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.35rem" }}>
            {s.recent.map((r, i) => (
              <li key={i} style={{ display: "flex", gap: "0.55rem", alignItems: "baseline", fontSize: "0.85rem", color: r.upcoming ? "#92400e" : "var(--ink-soft)" }}>
                <span aria-hidden="true" style={{ width: 18, textAlign: "center", color: r.upcoming ? "#b45309" : "var(--teal-deep, #0f766e)" }}>{KIND_ICON[r.kind] || "•"}</span>
                <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{r.text}</span>
                <span className="text-muted" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{fmtDate(r.at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nothing yet — updates appear here as {first} works on their portfolio.</p>}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
        <button type="button" className="button" onClick={() => navigate(`/parent/student/${s.student_id}`)}>
          {s.dashboard_unlocked === false ? "View portfolio (Professional)" : "View portfolio"}
        </button>
        {s.minor && <button type="button" className="button ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Privacy & consent {open ? "▴" : "▾"}</button>}
      </div>

      {open && s.minor && (
        <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface-warm, #f8fafc)" }}>
          <p style={{ fontSize: "0.82rem", margin: "0 0 0.7rem", color: "var(--ink-soft)" }}>
            {s.consents?.parent_consent_at ? <>You gave consent on {fmtDate(s.consents.parent_consent_at)}. </> : null}
            Change these any time — {first} can see them in their Privacy settings too.
          </p>
          {[
            ["marketing", `${first} and I may receive news and offers.`],
            ["ai_improvement", `${first}'s de-identified data may be used to improve the AI.`]
          ].map(([k, label]) => (
            <label key={k} style={{ display: "flex", gap: "0.6rem", alignItems: "start", fontSize: "0.88rem", marginBottom: "0.5rem", cursor: "pointer", color: "var(--ink)" }}>
              <input type="checkbox" checked={!!s.consents?.[k]} disabled={!!saving} onChange={(e) => setConsent(k, e.target.checked)} style={{ marginTop: "0.25rem", accentColor: "var(--teal-deep, #0f766e)" }} />
              <span>{label}</span>
            </label>
          ))}
          {msg.text && <p style={{ fontSize: "0.8rem", margin: "0.2rem 0 0.4rem", color: msg.error ? "var(--error-deep)" : "var(--success-deep)" }}>{msg.text}</p>}

          <div style={{ borderTop: "1px solid var(--rule)", marginTop: "0.75rem", paddingTop: "0.75rem" }}>
            {!withdrawing ? (
              <button type="button" onClick={() => setWithdrawing(true)} style={{ background: "none", border: "none", padding: 0, color: "var(--error-deep)", textDecoration: "underline", cursor: "pointer", font: "inherit", fontSize: "0.85rem" }}>
                Withdraw consent and delete {first}'s data
              </button>
            ) : (
              <div>
                <strong style={{ color: "var(--error-deep)", fontSize: "0.9rem" }}>This deletes {first}'s account and everything in it.</strong>
                <p style={{ fontSize: "0.82rem", margin: "0.3rem 0 0.5rem", color: "var(--ink-soft)" }}>Grades, activities, essays and uploaded files are removed for good. It can't be undone. Type <strong>{first}</strong> to confirm.</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <input aria-label={`Type ${first} to confirm`} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} style={{ flex: "1 1 160px" }} />
                  <button type="button" className="button" style={{ background: "var(--error-deep)", borderColor: "var(--error-deep)" }} disabled={saving === "withdraw" || confirmName.trim().toLowerCase() !== first.toLowerCase()} onClick={withdraw}>
                    {saving === "withdraw" ? "Deleting…" : "Delete"}
                  </button>
                  <button type="button" className="button ghost" onClick={() => { setWithdrawing(false); setConfirmName(""); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function ParentDashboard() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState({ text: "", error: false });
  const [showLinkForm, setShowLinkForm] = useState(false);

  const loadStudents = () => apiFetch("/api/parents/me/students").then(setStudents).catch(() => setStudents([]));
  useEffect(() => {
    apiFetch("/api/auth/me").then(setUser).catch(() => {});
    loadStudents();
  }, []);

  const linkStudent = async () => {
    if (!inviteCode.trim()) return;
    setStatus({ text: "Linking…", error: false });
    try {
      await apiFetch("/api/parents/me/link", { method: "POST", body: JSON.stringify({ invite_code: inviteCode.trim() }) });
      setInviteCode(""); setShowLinkForm(false); loadStudents();
      setStatus({ text: "Linked.", error: false });
      setTimeout(() => setStatus({ text: "", error: false }), 4000);
    } catch (err) { setStatus({ text: err.message, error: true }); }
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Parent Dashboard</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Welcome, {user?.name || "Parent"}.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
          Follow your children's university applications, see what they've been working on, and manage their privacy choices.
        </p>
      </header>

      <div className="flex-between" style={{ marginBottom: "1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: 0 }}>Your children</h2>
        <button className="button ghost" onClick={() => setShowLinkForm(!showLinkForm)}>{showLinkForm ? "Cancel" : "+ Add with an invite code"}</button>
      </div>

      {status.text && <p style={{ fontSize: "0.85rem", color: status.error ? "var(--error-deep)" : "var(--success-deep)", marginTop: 0 }}>{status.text}</p>}

      {showLinkForm && (
        <div className="card" style={{ background: "var(--surface-warm)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p className="muted" style={{ fontSize: "0.88rem", marginTop: 0 }}>Your child finds their code in Settings → Parent invite code. Children who listed your email when signing up are added automatically when you give consent.</p>
          <div className="input">
            <label htmlFor="pd-code">Invite code</label>
            <input id="pd-code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="12-character code" className="mono" style={{ letterSpacing: "0.15em", fontSize: "1rem" }} />
          </div>
          <button className="button" onClick={linkStudent} disabled={!inviteCode.trim()}>Add child</button>
        </div>
      )}

      {students === null ? (
        <p className="muted">Loading…</p>
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--ink)", marginBottom: "0.5rem" }}>No children linked yet</div>
          <p className="muted" style={{ maxWidth: "46ch", margin: "0 auto" }}>When your child signs up and lists your email, you'll get a consent email that adds them here. You can also add them with their invite code.</p>
        </div>
      ) : (
        <div className="grid two">
          {students.map((s) => <ChildCard key={s.student_id} s={s} onChanged={loadStudents} />)}
        </div>
      )}
    </div>
  );
}
