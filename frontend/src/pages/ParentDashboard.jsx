import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const loadStudents = () => {
    apiFetch("/api/parents/me/students")
      .then(setStudents)
      .catch(() => {});
  };

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(setUser)
      .catch(() => {});
    loadStudents();
  }, []);

  const linkStudent = async () => {
    if (!inviteCode) return;
    setStatus("Linking...");
    try {
      await apiFetch("/api/parents/me/link", {
        method: "POST",
        body: JSON.stringify({ invite_code: inviteCode })
      });
      setInviteCode("");
      setShowLinkForm(false);
      loadStudents();
      setStatus("✓ Successfully linked! Student profile is now available.");
      setTimeout(() => setStatus(""), 5000);
    } catch (err) {
      setStatus(err.message);
    }
  };

  const userName = user?.name || "Parent";

  return (
    <div className="grid" style={{ gap: "1.5rem" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
          color: "#fff",
          padding: "2rem",
          borderRadius: "0.75rem",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Parent Dashboard - Welcome, {userName}!
        </h1>
        <p style={{ fontSize: "1.125rem", opacity: 0.95 }}>
          Monitor your linked students' portfolio progress and stay updated with important notifications.
        </p>
      </div>

      {/* Main Content: Linked Students and Notifications */}
      <div className="parent-dashboard-layout" style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "1.5rem" }}>
        {/* Linked Students Section */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
            <div className="section-title">Linked Students</div>
            <button className="button" onClick={() => setShowLinkForm(!showLinkForm)}>
              {showLinkForm ? "Cancel" : "+ Link Student"}
            </button>
          </div>

          {showLinkForm && (
            <div className="card" style={{ background: "var(--bg-secondary)", marginBottom: "1.5rem", padding: "1.5rem" }}>
              <div className="subtitle" style={{ marginBottom: "1rem" }}>Link a Student Account</div>
              <div className="input">
                <label>Student Invite Code</label>
                <input 
                  value={inviteCode} 
                  onChange={(e) => setInviteCode(e.target.value)} 
                  placeholder="Enter 12-character code from student"
                  style={{ fontFamily: "monospace", letterSpacing: "2px" }}
                />
              </div>
              <button className="button" onClick={linkStudent} disabled={!inviteCode.trim()}>
                Link Student Account
              </button>
              {status && (
                <p className="muted" style={{ marginTop: "0.75rem", color: status.includes("Linked") ? "#10b981" : "#ef4444" }}>
                  {status}
                </p>
              )}
            </div>
          )}

          {students.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👨‍👩‍👧</div>
              <p className="muted" style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
                No students linked yet
              </p>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                Click "Link Student" above to connect to your student's account using their invite code.
              </p>
            </div>
          ) : (
            <div className="grid two" style={{ gap: "1rem" }}>
              {students.map((student) => (
                <div
                  key={student.student_id}
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => navigate(`/parent/student/${student.student_id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  {/* Profile Picture Placeholder */}
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                      margin: "0 auto 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "2rem",
                      fontWeight: "700"
                    }}
                  >
                    {student.name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  
                  <div className="subtitle" style={{ marginBottom: "0.5rem" }}>{student.name}</div>
                  <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
                    Profile Completion: {student.completion ?? 0}%
                  </p>
                  
                  <div className="progress" style={{ marginBottom: "1rem" }}>
                    <span style={{ width: `${student.completion ?? 0}%`, background: "#14b8a6" }} />
                  </div>
                  
                  <button
                    className="button"
                    style={{ width: "100%", background: "#14b8a6" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/parent/student/${student.student_id}`);
                    }}
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div className="card">
          <div className="section-title">Notifications</div>
          <div className="list" style={{ marginTop: "1rem" }}>
            {students.length > 0 ? (
              <>
                {students.map((student, idx) => (
                  <div
                    key={student.student_id}
                    style={{
                      display: "flex",
                      alignItems: "start",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      background: "var(--bg-secondary)",
                      borderRadius: "0.5rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    <div style={{ fontSize: "1.25rem", color: "#14b8a6" }}>🔔</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.875rem", margin: 0 }}>
                        <strong>{student.name}</strong> updated their academic profile.
                      </p>
                      <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {students.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "start",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      background: "var(--bg-secondary)",
                      borderRadius: "0.5rem"
                    }}
                  >
                    <div style={{ fontSize: "1.25rem", color: "#14b8a6" }}>🔔</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.875rem", margin: 0 }}>
                        New university recommendations available for <strong>{students[0]?.name}</strong>.
                      </p>
                      <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p className="muted">No notifications yet. Link a student to see updates here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
