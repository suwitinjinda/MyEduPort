import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const loadStudents = () => apiFetch("/api/parents/me/students").then(setStudents).catch(() => {});

  useEffect(() => {
    apiFetch("/api/auth/me").then(setUser).catch(() => {});
    loadStudents();
  }, []);

  const linkStudent = async () => {
    if (!inviteCode) return;
    setStatus("Linking…");
    try {
      await apiFetch("/api/parents/me/link", { method: "POST", body: JSON.stringify({ invite_code: inviteCode }) });
      setInviteCode("");
      setShowLinkForm(false);
      loadStudents();
      setStatus("Successfully linked.");
      setTimeout(() => setStatus(""), 4000);
    } catch (err) {
      setStatus(err.message);
    }
  };

  const userName = user?.name || "Parent";

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Parent Dashboard</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Welcome, {userName}.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
          Monitor your linked students' portfolio progress and stay
          informed about milestones — without managing the work itself.
        </p>
      </header>

      <div className="parent-dashboard-layout">
        <div>
          <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
            <h2 className="section-title" style={{ fontSize: "1.5rem", marginBottom: 0 }}>Linked students</h2>
            <button className="button gold" onClick={() => setShowLinkForm(!showLinkForm)}>
              {showLinkForm ? "Cancel" : "+ Link student"}
            </button>
          </div>

          {showLinkForm && (
            <div className="card" style={{ background: "var(--surface-warm)", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 className="subtitle" style={{ marginBottom: "1rem" }}>Link a student account</h3>
              <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1rem" }}>
                Ask your student to generate an invite code from their
                Portfolio editor, then paste it below.
              </p>
              <div className="input">
                <label>Invite code</label>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="12-character code"
                  className="mono"
                  style={{ letterSpacing: "0.15em", fontSize: "1rem" }}
                />
              </div>
              <button className="button" onClick={linkStudent} disabled={!inviteCode.trim()}>
                Link account
              </button>
              {status && (
                <p
                  className="muted"
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "0.85rem",
                    color: status.includes("Successfully") || status.includes("Linked") ? "var(--success)" : "var(--error)"
                  }}
                >
                  {status}
                </p>
              )}
            </div>
          )}

          {students.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--ink-muted)", fontStyle: "italic", marginBottom: "0.5rem" }}>
                No linked students yet.
              </div>
              <p className="muted">Click "+ Link student" above to begin.</p>
            </div>
          ) : (
            <div className="grid two">
              {students.map((s) => (
                <article
                  key={s.student_id}
                  className="card"
                  style={{ padding: "1.75rem", cursor: "pointer", transition: "all 0.2s ease" }}
                  onClick={() => navigate(`/parent/student/${s.student_id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        background: "var(--ink)",
                        color: "var(--gold)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em"
                      }}
                    >
                      {s.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)" }}>
                        {s.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "0.15rem" }}>
                        Student
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex-between" style={{ marginBottom: "0.4rem", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600 }}>
                      <span>Portfolio</span>
                      <span style={{ color: "var(--ink)" }}>{s.completion ?? 0}%</span>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${s.completion ?? 0}%` }} />
                    </div>
                  </div>
                  <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--gold-deep)", fontWeight: 600 }}>
                    {s.dashboard_unlocked === false ? "🔒 Full portfolio view needs Professional →" : "View portfolio →"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside>
          <h2 className="section-title" style={{ fontSize: "1.25rem" }}>Notifications</h2>
          <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1rem" }}>
            Updates and milestones from your linked students.
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {students.length > 0 ? (
              students.flatMap((s) => [
                {
                  key: `${s.student_id}-a`,
                  text: <><strong>{s.name}</strong> updated their academic profile.</>,
                  date: new Date()
                },
                {
                  key: `${s.student_id}-b`,
                  text: <>New university recommendations available for <strong>{s.name}</strong>.</>,
                  date: new Date()
                }
              ]).map((n) => (
                <div
                  key={n.key}
                  className="card compact"
                  style={{ borderLeft: "2px solid var(--gold)", padding: "0.85rem 1rem" }}
                >
                  <p style={{ fontSize: "0.88rem", fontFamily: "var(--font-serif)", color: "var(--ink-soft)", marginBottom: "0.2rem", lineHeight: 1.5 }}>
                    {n.text}
                  </p>
                  <p className="text-muted">{fmtDate(n.date)}</p>
                </div>
              ))
            ) : (
              <p className="muted" style={{ textAlign: "center", padding: "1.5rem", fontSize: "0.88rem" }}>
                No notifications yet. Link a student to see updates here.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
