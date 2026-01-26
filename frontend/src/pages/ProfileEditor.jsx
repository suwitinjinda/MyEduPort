import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch, apiUpload, getUserRole } from "../api/client";

export default function ProfileEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getUserRole();
  
  useEffect(() => {
    if (role === "parent") {
      navigate("/parent", { replace: true });
    }
  }, [role, navigate]);
  
  if (role === "parent") return null;

  const [activeSection, setActiveSection] = useState("academics");
  const [profile, setProfile] = useState({
    grade_level: "",
    school: "",
    target_countries: "",
    intended_major: "",
    bio: ""
  });
  const [academics, setAcademics] = useState([]);
  const [tests, setTests] = useState([]);
  const [awards, setAwards] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [academicForm, setAcademicForm] = useState({ year: "", course: "", level: "", grade: "", school_system: "" });
  const [testForm, setTestForm] = useState({ test_type: "", test_date: "", score: "", superscore: "" });
  const [awardForm, setAwardForm] = useState({ title: "", description: "", award_date: "" });
  const [uploadForm, setUploadForm] = useState({ category: "academics", file: null });
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch("/api/students/me")
      .then((data) => {
        if (data) {
          setProfile({
            grade_level: data.grade_level || "",
            school: data.school || "",
            target_countries: data.target_countries || "",
            intended_major: data.intended_major || "",
            bio: data.bio || ""
          });
        }
      })
      .catch(() => {});
    apiFetch("/api/students/me/academics").then(setAcademics).catch(() => {});
    apiFetch("/api/students/me/tests").then(setTests).catch(() => {});
    apiFetch("/api/students/me/awards").then(setAwards).catch(() => {});
    apiFetch("/api/uploads/me").then(setDocuments).catch(() => {});
  }, []);

  const updateField = (key) => (e) => setProfile((prev) => ({ ...prev, [key]: e.target.value }));

  const saveProfile = async () => {
    setStatus("Saving...");
    try {
      await apiFetch("/api/students/me", {
        method: "PUT",
        body: JSON.stringify(profile)
      });
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
    const data = await apiFetch("/api/students/me/academics");
    setAcademics(data);
  };

  const deleteAcademic = async (id) => {
    await apiFetch(`/api/students/me/academics/${id}`, { method: "DELETE" });
    const data = await apiFetch("/api/students/me/academics");
    setAcademics(data);
  };

  const addTest = async (e) => {
    e.preventDefault();
    await apiFetch("/api/students/me/tests", { method: "POST", body: JSON.stringify(testForm) });
    setTestForm({ test_type: "", test_date: "", score: "", superscore: "" });
    const data = await apiFetch("/api/students/me/tests");
    setTests(data);
  };

  const deleteTest = async (id) => {
    await apiFetch(`/api/students/me/tests/${id}`, { method: "DELETE" });
    const data = await apiFetch("/api/students/me/tests");
    setTests(data);
  };

  const addAward = async (e) => {
    e.preventDefault();
    await apiFetch("/api/students/me/awards", { method: "POST", body: JSON.stringify(awardForm) });
    setAwardForm({ title: "", description: "", award_date: "" });
    const data = await apiFetch("/api/students/me/awards");
    setAwards(data);
  };

  const deleteAward = async (id) => {
    await apiFetch(`/api/students/me/awards/${id}`, { method: "DELETE" });
    const data = await apiFetch("/api/students/me/awards");
    setAwards(data);
  };

  const uploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setStatus("Please select a file to upload");
      return;
    }
    setStatus("Uploading...");
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("category", uploadForm.category);
      await apiUpload("/api/uploads/me", formData);
      setStatus("Document uploaded successfully!");
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
      setUploadForm({ category: "academics", file: null });
      const data = await apiFetch("/api/uploads/me");
      setDocuments(data);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
      console.error("Upload error:", err);
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }
    try {
      await apiFetch(`/api/uploads/me/${id}`, { method: "DELETE" });
      setStatus("Document deleted successfully!");
      const data = await apiFetch("/api/uploads/me");
      setDocuments(data);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(`Delete failed: ${err.message}`);
      console.error("Delete error:", err);
    }
  };

  const loadInviteCode = async () => {
    const data = await apiFetch("/api/students/me/invite");
    setInviteCode(data.invite_code);
  };

  const sections = [
    { id: "personal", label: "Personal Info", icon: "👤" },
    { id: "academics", label: "Academics", icon: "📚" },
    { id: "extracurriculars", label: "Extracurriculars", icon: "🎯" },
    { id: "awards", label: "Awards", icon: "🏆" },
    { id: "documents", label: "Documents", icon: "📄" }
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "#1e293b",
          color: "#fff",
          padding: "1rem 2rem",
          borderRadius: "0.75rem 0.75rem 0 0",
          marginBottom: "0",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}
      >
        <span style={{ fontSize: "1.25rem", color: "#ef4444" }}>✏️</span>
        <span style={{ fontWeight: "600", fontSize: "1.125rem" }}>Profile Editor</span>
      </div>

      <div className="profile-editor-layout" style={{ marginTop: "0" }}>
        {/* Sidebar Navigation */}
        <aside style={{ position: "sticky", top: "100px", alignSelf: "start" }}>
          <div className="card" style={{ padding: "1rem", background: "var(--bg-primary)", borderRadius: "0 0 0 0.75rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              SECTION
            </div>
          <div className="list" style={{ gap: "0.25rem" }}>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  background: activeSection === section.id ? "rgba(37, 99, 235, 0.1)" : "transparent",
                  border: "none",
                  borderRadius: "0.5rem",
                  color: activeSection === section.id ? "var(--primary)" : "var(--text-secondary)",
                  fontWeight: activeSection === section.id ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.9375rem"
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

        {/* Main Content */}
        <div className="card" style={{ padding: "2rem", borderRadius: "0 0.75rem 0.75rem 0", marginTop: "0" }}>
        {/* Personal Info Section */}
        {activeSection === "personal" && (
          <>
            <div className="section-title">Personal Information</div>
            <div className="grid two">
              <div className="input">
                <label>School Name</label>
                <input value={profile.school} onChange={updateField("school")} placeholder="Your school name" />
              </div>
              <div className="input">
                <label>Current Grade Level</label>
                <select value={profile.grade_level} onChange={updateField("grade_level")}>
                  <option value="">Select grade</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                  <option value="Year 10">Year 10</option>
                  <option value="Year 11">Year 11</option>
                  <option value="Year 12">Year 12</option>
                  <option value="Year 13">Year 13</option>
                </select>
              </div>
            </div>
            <div className="grid two">
              <div className="input">
                <label>Target Countries</label>
                <input value={profile.target_countries} onChange={updateField("target_countries")} placeholder="US, UK, China" />
              </div>
              <div className="input">
                <label>Intended Major</label>
                <input value={profile.intended_major} onChange={updateField("intended_major")} placeholder="Computer Science" />
              </div>
            </div>
            <div className="input">
              <label>Profile Summary (Bio)</label>
              <textarea rows="4" value={profile.bio} onChange={updateField("bio")} placeholder="Short personal statement about your academic goals and interests" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button className="button" onClick={saveProfile}>
                Save
              </button>
            </div>
            {status && <p className="muted" style={{ marginTop: "0.75rem", textAlign: "right" }}>{status}</p>}
          </>
        )}

        {/* Academics Section */}
        {activeSection === "academics" && (
          <>
            <div className="section-title">Academic Profile</div>
            
            {/* School Information */}
            <div style={{ marginBottom: "2rem" }}>
              <div className="subtitle" style={{ marginBottom: "1rem" }}>School Information</div>
              <div className="grid two">
                <div className="input">
                  <label>School Name</label>
                  <input value={profile.school} onChange={updateField("school")} placeholder="Your school name" />
                </div>
                <div className="input">
                  <label>Current Grade Level</label>
                  <select value={profile.grade_level} onChange={updateField("grade_level")}>
                    <option value="">Select grade</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                    <option value="Year 10">Year 10</option>
                    <option value="Year 11">Year 11</option>
                    <option value="Year 12">Year 12</option>
                    <option value="Year 13">Year 13</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Yearly Grades */}
            <div style={{ marginBottom: "2rem" }}>
              <div className="subtitle" style={{ marginBottom: "1rem" }}>Yearly Grades</div>
              <form onSubmit={addAcademic} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Year</label>
                    <select value={academicForm.year} onChange={(e) => setAcademicForm({ ...academicForm, year: e.target.value })}>
                      <option value="">Select</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2023-2024">2023-2024</option>
                      <option value="2022-2023">2022-2023</option>
                      <option value="2021-2022">2021-2022</option>
                    </select>
                  </div>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Course Name</label>
                    <input value={academicForm.course} onChange={(e) => setAcademicForm({ ...academicForm, course: e.target.value })} placeholder="Mathematics" />
                  </div>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Level (e.g., AP, IB)</label>
                    <select value={academicForm.level} onChange={(e) => setAcademicForm({ ...academicForm, level: e.target.value })}>
                      <option value="">Select</option>
                      <option value="AP">AP</option>
                      <option value="IB HL">IB HL</option>
                      <option value="IB SL">IB SL</option>
                      <option value="A-Level">A-Level</option>
                      <option value="Standard">Standard</option>
                    </select>
                  </div>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Grade</label>
                    <input value={academicForm.grade} onChange={(e) => setAcademicForm({ ...academicForm, grade: e.target.value })} placeholder="A, B+, 7" />
                  </div>
                </div>
                <button className="button" type="submit" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                  Add Course
                </button>
              </form>

              {/* Existing Academic Records Table */}
              {academics.length > 0 && (
                <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Year</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Course Name</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Level (e.g., AP, IB)</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Grade</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academics.map((item) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{item.year || "-"}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{item.course || "-"}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{item.level || "-"}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600" }}>{item.grade || "-"}</td>
                          <td style={{ padding: "0.75rem" }}>
                            <button
                              className="button ghost"
                              onClick={() => deleteAcademic(item.id)}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Standardized Tests */}
            <div style={{ marginBottom: "2rem" }}>
              <div className="subtitle" style={{ marginBottom: "1rem" }}>Standardized Tests</div>
              <form onSubmit={addTest} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Test Type</label>
                    <select value={testForm.test_type} onChange={(e) => setTestForm({ ...testForm, test_type: e.target.value })}>
                      <option value="">Select</option>
                      <option value="SAT">SAT</option>
                      <option value="ACT">ACT</option>
                      <option value="IELTS">IELTS</option>
                      <option value="TOEFL">TOEFL</option>
                      <option value="SAT Math">SAT Math</option>
                      <option value="SAT Reading">SAT Reading</option>
                    </select>
                  </div>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Test Date</label>
                    <input type="date" value={testForm.test_date} onChange={(e) => setTestForm({ ...testForm, test_date: e.target.value })} />
                  </div>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Score</label>
                    <input value={testForm.score} onChange={(e) => setTestForm({ ...testForm, score: e.target.value })} placeholder="1450" />
                  </div>
                  <div className="input" style={{ marginBottom: "0" }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Superscore</label>
                    <input value={testForm.superscore} onChange={(e) => setTestForm({ ...testForm, superscore: e.target.value })} placeholder="1480" />
                  </div>
                </div>
                <button className="button" type="submit" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                  Add Test Score
                </button>
              </form>

              {/* Existing Test Scores */}
              {tests.length > 0 && (
                <div className="list">
                  {tests.map((item) => (
                    <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>{item.test_type}</strong>
                        <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                          Date: {item.test_date || "N/A"} • Score: {item.score}
                          {item.superscore && ` • Superscore: ${item.superscore}`}
                        </p>
                      </div>
                      <button
                        className="button ghost"
                        onClick={() => deleteTest(item.id)}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
              <button className="button" onClick={saveProfile}>
                Save
              </button>
            </div>
            {status && <p className="muted" style={{ marginTop: "0.75rem", textAlign: "right" }}>{status}</p>}
          </>
        )}

        {/* Extracurriculars Section */}
        {activeSection === "extracurriculars" && (
          <>
            <div className="section-title">Extracurricular Activities</div>
            <p className="muted" style={{ marginBottom: "1.5rem" }}>
              Manage your extracurricular activities. Go to the Activities page for detailed editing.
            </p>
            <button className="button" onClick={() => navigate("/activities")}>
              Go to Activities Editor
            </button>
          </>
        )}

        {/* Awards Section */}
        {activeSection === "awards" && (
          <>
            <div className="section-title">Awards & Achievements</div>
            <form onSubmit={addAward} style={{ marginBottom: "1.5rem" }}>
              <div className="grid two">
                <div className="input">
                  <label>Title</label>
                  <input value={awardForm.title} onChange={(e) => setAwardForm({ ...awardForm, title: e.target.value })} placeholder="Award title" />
                </div>
                <div className="input">
                  <label>Date</label>
                  <input type="date" value={awardForm.award_date} onChange={(e) => setAwardForm({ ...awardForm, award_date: e.target.value })} />
                </div>
              </div>
              <div className="input">
                <label>Description</label>
                <textarea rows="3" value={awardForm.description} onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })} placeholder="Describe the award and its significance" />
              </div>
              <button className="button" type="submit">Add Award</button>
            </form>
            <div className="list">
              {awards.map((item) => (
                <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <strong>{item.title}</strong>
                    {item.description && <p className="muted" style={{ marginTop: "0.5rem" }}>{item.description}</p>}
                    {item.award_date && <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Date: {item.award_date}</p>}
                  </div>
                  <button
                    className="button ghost"
                    onClick={() => deleteAward(item.id)}
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {awards.length === 0 && (
                <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No awards added yet.</p>
              )}
            </div>
          </>
        )}

        {/* Documents Section */}
        {activeSection === "documents" && (
          <>
            <div className="section-title">Documents</div>
            {status && (
              <div
                className="card"
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  background: status.includes("success") || status.includes("uploaded")
                    ? "rgba(16, 185, 129, 0.1)"
                    : status.includes("failed") || status.includes("error")
                    ? "rgba(239, 68, 68, 0.1)"
                    : "var(--bg-secondary)"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: status.includes("success") || status.includes("uploaded")
                      ? "var(--success)"
                      : status.includes("failed") || status.includes("error")
                      ? "var(--error)"
                      : "var(--text-primary)",
                    fontSize: "0.875rem",
                    fontWeight: "600"
                  }}
                >
                  {status}
                </p>
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
                  <input
                    type="file"
                    key={uploadForm.file ? "has-file" : "no-file"}
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  />
                </div>
              </div>
              <button className="button" type="submit" disabled={!uploadForm.file || status === "Uploading..."}>
                {status === "Uploading..." ? "Uploading..." : "Upload Document"}
              </button>
            </form>
            <div className="list">
              {documents.length === 0 ? (
                <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <strong>{doc.original_name || doc.filename || "Document"}</strong>
                      <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        {doc.category} • Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "Unknown date"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <a
                        href={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${doc.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        View
                      </a>
                      <button
                        className="button ghost"
                        onClick={() => deleteDocument(doc.id)}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--error)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
        </div>
      </div>

      {/* Bottom Section - Additional Info */}
      <div style={{ marginTop: "1.5rem" }}>
        <div className="grid two">
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)", border: "2px solid rgba(99, 102, 241, 0.2)" }}>
            <div className="section-title">Parent Invite Code</div>
            <p className="muted" style={{ marginBottom: "12px" }}>
              Share this code with a parent so they can link to your profile and monitor your progress.
            </p>
            <button className="button" onClick={loadInviteCode} style={{ width: "100%" }}>
              {inviteCode ? "Regenerate Code" : "Generate Code"}
            </button>
            {inviteCode && (
              <div style={{ marginTop: "16px", padding: "16px", background: "#fff", borderRadius: "12px", border: "2px solid rgba(99, 102, 241, 0.3)" }}>
                <p className="muted" style={{ fontSize: "12px", marginBottom: "8px" }}>Your Invite Code:</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <code style={{ 
                    fontSize: "18px", 
                    fontWeight: "700", 
                    letterSpacing: "3px", 
                    color: "#6366f1",
                    flex: 1,
                    textAlign: "center",
                    padding: "8px",
                    background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: "8px"
                  }}>
                    {inviteCode}
                  </code>
                  <button 
                    className="button ghost" 
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode);
                      alert("Code copied to clipboard!");
                    }}
                    style={{ padding: "8px 12px" }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <div className="section-title">Quick Links</div>
            <div className="list">
              <a href="/activities" style={{ display: "block", padding: "0.5rem 0", color: "var(--primary)" }}>Extracurricular Activities</a>
              <a href="/recommendations" style={{ display: "block", padding: "0.5rem 0", color: "var(--primary)" }}>University Matches</a>
              <a href="/export" style={{ display: "block", padding: "0.5rem 0", color: "var(--primary)" }}>Export Portfolio</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
