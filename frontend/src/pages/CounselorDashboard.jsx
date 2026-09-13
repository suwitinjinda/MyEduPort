import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { EmptyState } from "../components/Skeleton.jsx";
import Skeleton from "../components/Skeleton.jsx";

export default function CounselorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [status, setStatus] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        apiFetch("/api/auth/me").catch(() => null),
        apiFetch("/api/counselors/me/students").catch(() => [])
      ]);
      setUser(u);
      setStudents(s || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const link = async () => {
    if (!inviteCode) return;
    setStatus("Linking…");
    try {
      await apiFetch("/api/counselors/me/link", {
        method: "POST",
        body: JSON.stringify({ invite_code: inviteCode })
      });
      setInviteCode("");
      setShowLink(false);
      setStatus("Successfully linked.");
      loadAll();
      setTimeout(() => setStatus(""), 3500);
    } catch (e) {
      setStatus(e.message);
    }
  };

  const unlink = async (studentId, name) => {
    if (!window.confirm(`Stop advising ${name}?`)) return;
    await apiFetch(`/api/counselors/me/students/${studentId}`, { method: "DELETE" });
    loadAll();
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Counselor Dashboard</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Welcome, {user?.name || "Counselor"}.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
          You're advising {students.length} {students.length === 1 ? "student" : "students"}. Click any profile to see academics, activities, awards, and documents.
        </p>
      </header>

      <div className="flex-between" style={{ marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: 0 }}>Advised students</h2>
        <button className="button gold" onClick={() => setShowLink(!showLink)}>
          {showLink ? "Cancel" : "+ Link student"}
        </button>
      </div>

      {showLink && (
        <div className="card" style={{ background: "var(--surface-warm)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 className="subtitle" style={{ marginBottom: "0.75rem" }}>Link a student account</h3>
          <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1rem" }}>
            Ask the student to generate an invite code from their Portfolio editor (Settings → Parent Invite Code). Paste it below.
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
          <button className="button" onClick={link} disabled={!inviteCode.trim()}>Link account</button>
          {status && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: status.includes("Success") ? "var(--success)" : "var(--error)", fontWeight: 600 }}>
              {status}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <Skeleton lines={5} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students linked yet."
          hint="Use the button above to connect to a student's portfolio with their invite code."
        />
      ) : (
        <div className="grid two">
          {students.map((s) => (
            <article
              key={s.student_id}
              className="card"
              style={{ padding: "1.75rem", cursor: "pointer", transition: "all 0.2s ease" }}
              onClick={() => navigate(`/counselor/student/${s.student_id}`)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "var(--ink)",
                    color: "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: "1.2rem",
                    fontWeight: 700
                  }}
                >
                  {(s.name || "S").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>
                    {s.name}
                  </div>
                  <p className="text-muted" style={{ marginTop: "0.15rem" }}>
                    {s.grade_level || "—"} · {s.school || "—"}
                  </p>
                </div>
                <button
                  className="button ghost"
                  onClick={(e) => { e.stopPropagation(); unlink(s.student_id, s.name); }}
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.65rem", color: "var(--error)", borderColor: "var(--error)" }}
                >
                  Unlink
                </button>
              </div>
              <div>
                <div className="flex-between" style={{ marginBottom: "0.4rem", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600 }}>
                  <span>Completion</span>
                  <span style={{ color: "var(--ink)" }}>{s.completion ?? 0}%</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${s.completion ?? 0}%` }} />
                </div>
                <p className="text-muted" style={{ marginTop: "0.6rem" }}>
                  {s.intended_major ? `Major: ${s.intended_major}` : "No major set"} · {s.academic_count} academic · {s.activity_count} activities · {s.award_count} awards
                </p>
              </div>
              <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--gold-deep)", fontWeight: 600 }}>
                View portfolio →
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
