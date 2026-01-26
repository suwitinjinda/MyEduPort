import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, getUserRole } from "../api/client";

export default function Dashboard() {
  const navigate = useNavigate();
  const role = getUserRole();
  
  useEffect(() => {
    if (role === "parent") {
      navigate("/parent", { replace: true });
    }
  }, [role, navigate]);
  
  if (role === "parent") return null;
  
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [academics, setAcademics] = useState([]);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [gap, setGap] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, summaryData, academicsData, activitiesData, documentsData, gapData] = await Promise.all([
        apiFetch("/api/auth/me").catch(() => null),
        apiFetch("/api/students/me/summary").catch(() => null),
        apiFetch("/api/students/me/academics").catch(() => []),
        apiFetch("/api/students/me/activities").catch(() => []).then(data => Array.isArray(data) ? data : []),
        apiFetch("/api/uploads/me").catch(() => []),
        apiFetch("/api/ai/gap-analysis").catch(() => [])
      ]);
      
      setUser(userData);
      setSummary(summaryData);
      setAcademics(academicsData || []);
      setActivities(activitiesData || []);
      setDocuments(documentsData || []);
      setGap(gapData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate GPA from academic records
  const calculateGPA = () => {
    if (!academics || academics.length === 0) return "0.0";
    
    const gradeMap = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    
    // For IB scores (1-7), convert to 4.0 scale
    const ibToGPA = (score) => {
      const map = { 7: 4.0, 6: 3.7, 5: 3.3, 4: 3.0, 3: 2.0, 2: 1.0, 1: 0.0 };
      return map[score] || 0;
    };
    
    let totalPoints = 0;
    let count = 0;
    
    academics.forEach(record => {
      let points = 0;
      if (gradeMap[record.grade]) {
        points = gradeMap[record.grade];
      } else if (!isNaN(record.grade)) {
        // IB score (1-7)
        points = ibToGPA(parseInt(record.grade));
      }
      if (points > 0) {
        totalPoints += points;
        count++;
      }
    });
    
    if (count === 0) return "0.0";
    return (totalPoints / count).toFixed(1);
  };

  const gpa = calculateGPA();
  const userName = user?.name || "Student";
  const completion = summary?.completion || 0;

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: "1.5rem" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          color: "#fff",
          padding: "2rem",
          borderRadius: "0.75rem",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Student Dashboard
        </h1>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "400", marginBottom: "1rem", opacity: 0.95 }}>
          Welcome, {userName}!
        </h2>
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.9375rem", opacity: 0.95 }}>Profile Completion: {completion}%</span>
          </div>
          <div className="progress large" style={{ background: "rgba(255,255,255,0.3)" }}>
            <span style={{ width: `${completion}%`, background: "#10b981" }} />
          </div>
        </div>
      </div>

      {/* Three Summary Cards */}
      <div className="grid three">
        {/* Academic Summary Card */}
        <div className="card">
          <div className="section-title">Academic Summary</div>
          <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "var(--primary)", marginBottom: "1rem" }}>
            {gpa} GPA
          </div>
          <div className="list" style={{ marginTop: "1rem" }}>
            {academics.slice(0, 6).map((record, idx) => (
              <div key={record.id || idx} style={{ padding: "0.5rem 0", borderBottom: idx < 5 && idx < academics.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                <div style={{ fontSize: "0.875rem" }}>
                  <strong>Course {idx + 1}:</strong> {record.course || "N/A"}
                  {record.level && <span className="muted"> ({record.level})</span>}
                  {record.grade && <span className="muted"> • Grade: {record.grade}</span>}
                </div>
              </div>
            ))}
            {academics.length === 0 && (
              <p className="muted" style={{ fontSize: "0.875rem" }}>No academic records yet. Add courses in Portfolio.</p>
            )}
            {academics.length > 6 && (
              <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                + {academics.length - 6} more courses
              </p>
            )}
          </div>
        </div>

        {/* Extracurricular Activities Card */}
        <div className="card">
          <div className="section-title">Extracurricular Activities</div>
          <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "var(--primary)", marginBottom: "1rem" }}>
            {activities.length} Activities
          </div>
          <Link to="/activities" className="button" style={{ width: "100%", marginTop: "1rem" }}>
            Add New
          </Link>
        </div>

        {/* Uploaded Documents Card */}
        <div className="card">
          <div className="section-title">Uploaded Documents</div>
          <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "var(--primary)", marginBottom: "1rem" }}>
            {documents.length} Files
          </div>
          <Link to="/profile" className="button" style={{ width: "100%", marginTop: "1rem" }}>
            Manage
          </Link>
        </div>
      </div>

      {/* Next Steps Section */}
      <div className="card">
        <div className="section-title">Next Steps</div>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Generated by AI, prioritized actions to improve your profile:
        </p>
        {gap.length > 0 ? (
          <div className="list">
            {gap.map((item, idx) => (
              <div
                key={idx}
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
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: item.priority === "High" ? "var(--error)" : item.priority === "Medium" ? "var(--warning)" : "var(--primary)",
                    flexShrink: 0,
                    marginTop: "0.25rem"
                  }}
                />
                <span style={{ flex: 1 }}>{item.action}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <button className="button" onClick={() => apiFetch("/api/ai/gap-analysis").then(setGap).catch(() => {})}>
              Generate Next Steps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
