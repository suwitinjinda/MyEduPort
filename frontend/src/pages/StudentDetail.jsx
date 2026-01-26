import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    apiFetch(`/api/parents/me/students/${studentId}`)
      .then(setData)
      .catch((err) => {
        console.error(err);
        alert("Failed to load student data");
        navigate("/parent");
      })
      .finally(() => setLoading(false));
  }, [studentId, navigate]);

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Loading student data...</p>
      </div>
    );
  }

  if (!data) return null;

  const { profile, academics, tests, activities, awards, documents } = data;

  // Calculate GPA
  const calculateGPA = () => {
    if (!academics || academics.length === 0) return "0.0";
    
    const gradeMap = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    
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
  const completion = Math.round(
    ((academics.length > 0 ? 1 : 0) * 0.2 +
     (tests.length > 0 ? 1 : 0) * 0.2 +
     (activities.length > 0 ? 1 : 0) * 0.3 +
     (awards.length > 0 ? 1 : 0) * 0.15 +
     (documents.length > 0 ? 1 : 0) * 0.15) * 100
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "academics", label: "Academics", icon: "📚" },
    { id: "tests", label: "Test Scores", icon: "📝" },
    { id: "activities", label: "Activities", icon: "🎯" },
    { id: "awards", label: "Awards", icon: "🏆" },
    { id: "documents", label: "Documents", icon: "📄" }
  ];

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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <button
            className="button"
            onClick={() => navigate("/parent")}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)"
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          {profile.name}'s Portfolio
        </h1>
        <p style={{ fontSize: "1.125rem", opacity: 0.95, marginBottom: "1rem" }}>
          {profile.email}
        </p>
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.9375rem", opacity: 0.95 }}>Profile Completion: {completion}%</span>
          </div>
          <div className="progress large" style={{ background: "rgba(255,255,255,0.3)" }}>
            <span style={{ width: `${completion}%`, background: "#fff" }} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid three">
        <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "#14b8a6", marginBottom: "0.5rem" }}>
            {gpa}
          </div>
          <div className="section-title" style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>GPA</div>
          <p className="muted" style={{ fontSize: "0.75rem" }}>{academics.length} courses</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "#14b8a6", marginBottom: "0.5rem" }}>
            {tests.length}
          </div>
          <div className="section-title" style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>Test Scores</div>
          <p className="muted" style={{ fontSize: "0.75rem" }}>Standardized tests</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "#14b8a6", marginBottom: "0.5rem" }}>
            {activities.length}
          </div>
          <div className="section-title" style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>Activities</div>
          <p className="muted" style={{ fontSize: "0.75rem" }}>Extracurriculars</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`button ${activeTab === tab.id ? "" : "ghost"}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.75rem 1.25rem",
                background: activeTab === tab.id ? "#14b8a6" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-primary)",
                border: activeTab === tab.id ? "none" : "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          <div className="grid two">
            <div className="card">
              <div className="section-title">Profile Information</div>
              <div className="list" style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span className="muted">Grade Level:</span>
                  <strong>{profile.grade_level || "Not set"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span className="muted">School:</span>
                  <strong>{profile.school || "Not set"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span className="muted">Target Countries:</span>
                  <strong>{profile.target_countries || "Not set"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0" }}>
                  <span className="muted">Intended Major:</span>
                  <strong>{profile.intended_major || "Not set"}</strong>
                </div>
              </div>
              {profile.bio && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-light)" }}>
                  <div className="subtitle" style={{ marginBottom: "0.75rem" }}>Bio</div>
                  <p className="muted" style={{ lineHeight: "1.6" }}>{profile.bio}</p>
                </div>
              )}
            </div>
            <div className="card">
              <div className="section-title">Portfolio Summary</div>
              <div className="list" style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span className="muted">Academic Records:</span>
                  <span className="badge" style={{ background: "#14b8a6", color: "#fff" }}>{academics.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span className="muted">Test Scores:</span>
                  <span className="badge" style={{ background: "#14b8a6", color: "#fff" }}>{tests.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span className="muted">Activities:</span>
                  <span className="badge" style={{ background: "#14b8a6", color: "#fff" }}>{activities.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span className="muted">Awards:</span>
                  <span className="badge" style={{ background: "#14b8a6", color: "#fff" }}>{awards.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0" }}>
                  <span className="muted">Documents:</span>
                  <span className="badge" style={{ background: "#14b8a6", color: "#fff" }}>{documents.length}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(20, 184, 166, 0.05) 0%, rgba(13, 148, 136, 0.05) 100%)", border: "2px solid rgba(20, 184, 166, 0.2)" }}>
            <div className="section-title">Portfolio Completion Tips</div>
            <div className="list" style={{ marginTop: "1rem" }}>
              {academics.length < 3 && (
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem", padding: "0.75rem", background: "#fff", borderRadius: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                  <p className="muted" style={{ margin: 0 }}>Add at least 3 academic records for better portfolio strength</p>
                </div>
              )}
              {tests.length < 2 && (
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem", padding: "0.75rem", background: "#fff", borderRadius: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                  <p className="muted" style={{ margin: 0 }}>Add at least 2 standardized test scores (SAT, ACT, IELTS, etc.)</p>
                </div>
              )}
              {activities.length < 4 && (
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem", padding: "0.75rem", background: "#fff", borderRadius: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                  <p className="muted" style={{ margin: 0 }}>Add more extracurricular activities to showcase well-roundedness</p>
                </div>
              )}
              {awards.length < 2 && (
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem", padding: "0.75rem", background: "#fff", borderRadius: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                  <p className="muted" style={{ margin: 0 }}>Add awards and achievements to highlight accomplishments</p>
                </div>
              )}
              {academics.length >= 3 && tests.length >= 2 && activities.length >= 4 && awards.length >= 2 && (
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem", padding: "0.75rem", background: "#fff", borderRadius: "0.5rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>✓</span>
                  <p style={{ margin: 0, color: "#10b981", fontWeight: "600" }}>Portfolio looks strong! Keep adding more details.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "academics" && (
        <div className="card">
          <div className="section-title">Academic Records</div>
          {academics.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📚</div>
              <p className="muted">No academic records yet.</p>
            </div>
          ) : (
            <div className="grid two" style={{ marginTop: "1rem", gap: "1rem" }}>
              {academics.map((record) => (
                <div
                  key={record.id}
                  className="card"
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#14b8a6";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                    <div>
                      <strong style={{ fontSize: "1.125rem" }}>{record.course}</strong>
                      <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        {record.year} • {record.level || "N/A"}
                      </p>
                    </div>
                    <span className="badge" style={{ fontSize: "1rem", padding: "0.5rem 1rem", background: "#14b8a6", color: "#fff", fontWeight: "700" }}>
                      {record.grade}
                    </span>
                  </div>
                  {record.school_system && (
                    <p className="muted" style={{ fontSize: "0.875rem" }}>System: {record.school_system}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tests" && (
        <div className="card">
          <div className="section-title">Test Scores</div>
          {tests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
              <p className="muted">No test scores yet.</p>
            </div>
          ) : (
            <div className="grid two" style={{ marginTop: "1rem", gap: "1rem" }}>
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="card"
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#14b8a6";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                    <div>
                      <strong style={{ fontSize: "1.125rem" }}>{test.test_type}</strong>
                      <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        Date: {test.test_date ? new Date(test.test_date).toLocaleDateString() : "N/A"}
                      </p>
                      {test.superscore && (
                        <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                          Superscore: {test.superscore}
                        </p>
                      )}
                    </div>
                    <span className="badge" style={{ fontSize: "1.25rem", padding: "0.5rem 1rem", background: "#14b8a6", color: "#fff", fontWeight: "700" }}>
                      {test.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "activities" && (
        <div className="card">
          <div className="section-title">Extracurricular Activities</div>
          {activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
              <p className="muted">No activities yet.</p>
            </div>
          ) : (
            <div className="grid two" style={{ marginTop: "1rem", gap: "1rem" }}>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="card"
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#14b8a6";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                    <strong style={{ fontSize: "1.125rem" }}>{activity.title}</strong>
                    {activity.leadership && (
                      <span className="badge" style={{ background: "#14b8a6", color: "#fff" }}>Leadership</span>
                    )}
                  </div>
                  {activity.role && (
                    <p className="muted" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      <strong>Role:</strong> {activity.role}
                    </p>
                  )}
                  {activity.description && (
                    <p className="muted" style={{ fontSize: "0.875rem", marginBottom: "0.75rem", lineHeight: "1.6" }}>
                      {activity.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {activity.hours_per_week > 0 && (
                      <span className="badge" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
                        {activity.hours_per_week} hrs/week
                      </span>
                    )}
                    {activity.start_date && (
                      <span className="badge" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
                        {new Date(activity.start_date).toLocaleDateString()} - {activity.end_date ? new Date(activity.end_date).toLocaleDateString() : "Ongoing"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "awards" && (
        <div className="card">
          <div className="section-title">Awards & Achievements</div>
          {awards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏆</div>
              <p className="muted">No awards yet.</p>
            </div>
          ) : (
            <div className="grid two" style={{ marginTop: "1rem", gap: "1rem" }}>
              {awards.map((award) => (
                <div
                  key={award.id}
                  className="card"
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#14b8a6";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  <strong style={{ fontSize: "1.125rem" }}>{award.title}</strong>
                  {award.description && (
                    <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.75rem", lineHeight: "1.6" }}>
                      {award.description}
                    </p>
                  )}
                  {award.award_date && (
                    <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.75rem" }}>
                      <strong>Date:</strong> {new Date(award.award_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "documents" && (
        <div className="card">
          <div className="section-title">Documents</div>
          {documents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
              <p className="muted">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="grid two" style={{ marginTop: "1rem", gap: "1rem" }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="card"
                  style={{
                    padding: "1.25rem",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#14b8a6";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "var(--shadow)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <strong style={{ fontSize: "1.125rem" }}>{doc.original_name}</strong>
                      <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        {doc.category} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/uploads/${doc.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", background: "#14b8a6" }}
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
