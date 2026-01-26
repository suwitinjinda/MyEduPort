import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUniversity, setEditingUniversity] = useState(undefined); // undefined = hidden, null = new, number = editing
  const [universityForm, setUniversityForm] = useState({
    name: "",
    country: "",
    city: "",
    selectivity_band: "",
    major_tags: ""
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview" || activeTab === "users") {
        const [usersData, statsData] = await Promise.all([
          apiFetch("/api/admin/users").catch(() => []),
          apiFetch("/api/admin/stats").catch(() => null)
        ]);
        setUsers(usersData);
        setStats(statsData);
      }
      if (activeTab === "students") {
        const studentsData = await apiFetch("/api/admin/students").catch(() => []);
        setStudents(studentsData);
      }
      if (activeTab === "universities") {
        const universitiesData = await apiFetch("/api/admin/universities").catch(() => []);
        setUniversities(universitiesData);
      }
      setStatus("");
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/disable`, {
        method: "PUT",
        body: JSON.stringify({ disabled: !currentStatus })
      });
      loadData();
      setStatus(`User ${!currentStatus ? "disabled" : "enabled"}`);
    } catch (err) {
      setStatus(err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user account?")) return;
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      loadData();
      setStatus("User deleted");
    } catch (err) {
      setStatus(err.message);
    }
  };

  const saveUniversity = async () => {
    if (!universityForm.name || !universityForm.country) {
      setStatus("Name and Country are required");
      return;
    }
    try {
      if (editingUniversity && editingUniversity !== null) {
        // Editing existing university (editingUniversity is an object with id)
        await apiFetch(`/api/admin/universities/${editingUniversity.id}`, {
          method: "PUT",
          body: JSON.stringify(universityForm)
        });
        setStatus("University updated successfully");
      } else {
        // Adding new university (editingUniversity is null)
        await apiFetch("/api/admin/universities", {
          method: "POST",
          body: JSON.stringify(universityForm)
        });
        setStatus("University created successfully");
      }
      setEditingUniversity(undefined); // Hide form after save
      setUniversityForm({ name: "", country: "", city: "", selectivity_band: "", major_tags: "" });
      loadData();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const deleteUniversity = async (id) => {
    if (!window.confirm("Delete this university?")) return;
    try {
      await apiFetch(`/api/admin/universities/${id}`, { method: "DELETE" });
      loadData();
      setStatus("University deleted");
    } catch (err) {
      setStatus(err.message);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "students", label: "Students", icon: "🎓" },
    { id: "universities", label: "Universities", icon: "🏛️" }
  ];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          color: "#fff",
          padding: "2rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>Admin Dashboard</h1>
        <p style={{ fontSize: "1.125rem", opacity: 0.95 }}>Manage users, students, and university database</p>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`button ${activeTab === tab.id ? "" : "ghost"}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.75rem 1.25rem",
                background: activeTab === tab.id ? "var(--primary)" : "transparent",
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

      {status && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem", background: status.includes("error") ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)" }}>
          <p style={{ margin: 0, color: status.includes("error") ? "var(--error)" : "var(--success)", fontWeight: "600" }}>
            {status}
          </p>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="muted">Loading...</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && stats && (
            <div className="grid three" style={{ marginBottom: "2rem" }}>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "var(--primary)", marginBottom: "0.5rem" }}>
                  {stats.users}
                </div>
                <div className="section-title" style={{ fontSize: "0.875rem" }}>Total Users</div>
                <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  {stats.students} students, {stats.parents} parents
                </p>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: "700", color: "var(--primary)", marginBottom: "0.5rem" }}>
                  {stats.universities}
                </div>
                <div className="section-title" style={{ fontSize: "0.875rem" }}>Universities</div>
                <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>In database</p>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: "700", color: stats.disabled > 0 ? "var(--error)" : "var(--success)", marginBottom: "0.5rem" }}>
                  {stats.disabled}
                </div>
                <div className="section-title" style={{ fontSize: "0.875rem" }}>Disabled Accounts</div>
                <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Currently disabled</p>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="card">
              <div className="section-title">User Management</div>
              <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Name</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Email</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Role</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Consent</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{user.name}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{user.email}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          <span className="badge" style={{ background: user.role === "student" ? "var(--primary)" : "#14b8a6", color: "#fff" }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          {user.data_consent ? (
                            <span style={{ color: "var(--success)" }}>✓</span>
                          ) : (
                            <span style={{ color: "var(--error)" }}>✗</span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          {user.is_disabled ? (
                            <span className="badge" style={{ background: "var(--error)", color: "#fff" }}>Disabled</span>
                          ) : (
                            <span className="badge" style={{ background: "var(--success)", color: "#fff" }}>Active</span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className="button ghost"
                              onClick={() => toggleUserStatus(user.id, user.is_disabled)}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            >
                              {user.is_disabled ? "Enable" : "Disable"}
                            </button>
                            <button
                              className="button ghost"
                              onClick={() => deleteUser(user.id)}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--error)" }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === "students" && (
            <div className="card">
              <div className="section-title">Students Overview</div>
              <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Name</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Email</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Grade</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>School</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Records</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{student.name}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{student.email}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{student.grade_level || "-"}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{student.school || "-"}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          {student.academics_count} academics, {student.activities_count} activities, {student.tests_count} tests, {student.awards_count} awards
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          {student.is_disabled ? (
                            <span className="badge" style={{ background: "var(--error)", color: "#fff" }}>Disabled</span>
                          ) : (
                            <span className="badge" style={{ background: "var(--success)", color: "#fff" }}>Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Universities Tab */}
          {activeTab === "universities" && (
            <div>
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="flex-between" style={{ marginBottom: "1rem" }}>
                  <div className="section-title">University Database</div>
                  <button
                    className="button"
                    onClick={() => {
                      setEditingUniversity(null); // null = new university
                      setUniversityForm({ name: "", country: "", city: "", selectivity_band: "", major_tags: "" });
                    }}
                  >
                    + Add University
                  </button>
                </div>

                {editingUniversity !== undefined && (
                  <div className="card" style={{ background: "var(--bg-secondary)", padding: "1.5rem", marginBottom: "1rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>{editingUniversity && editingUniversity !== null ? "Edit University" : "Add New University"}</h3>
                    <div className="grid two">
                      <div className="input">
                        <label>Name *</label>
                        <input
                          value={universityForm.name}
                          onChange={(e) => setUniversityForm({ ...universityForm, name: e.target.value })}
                          placeholder="University Name"
                        />
                      </div>
                      <div className="input">
                        <label>Country *</label>
                        <select
                          value={universityForm.country}
                          onChange={(e) => setUniversityForm({ ...universityForm, country: e.target.value })}
                        >
                          <option value="">Select Country</option>
                          <option value="US">United States</option>
                          <option value="UK">United Kingdom</option>
                          <option value="China">China</option>
                        </select>
                      </div>
                      <div className="input">
                        <label>City</label>
                        <input
                          value={universityForm.city}
                          onChange={(e) => setUniversityForm({ ...universityForm, city: e.target.value })}
                          placeholder="City"
                        />
                      </div>
                      <div className="input">
                        <label>Selectivity Band</label>
                        <select
                          value={universityForm.selectivity_band}
                          onChange={(e) => setUniversityForm({ ...universityForm, selectivity_band: e.target.value })}
                        >
                          <option value="">Select</option>
                          <option value="Very High">Very High</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                        </select>
                      </div>
                    </div>
                    <div className="input">
                      <label>Major Tags (comma-separated)</label>
                      <input
                        value={universityForm.major_tags}
                        onChange={(e) => setUniversityForm({ ...universityForm, major_tags: e.target.value })}
                        placeholder="Engineering, Computer Science, Business"
                      />
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                      <button className="button" onClick={saveUniversity} disabled={!universityForm.name || !universityForm.country}>
                        {editingUniversity ? "Update" : "Create"}
                      </button>
                      <button
                        className="button ghost"
                        onClick={() => {
                          setEditingUniversity(undefined); // Hide form
                          setUniversityForm({ name: "", country: "", city: "", selectivity_band: "", major_tags: "" });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Name</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Country</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>City</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Selectivity</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {universities.map((uni) => (
                        <tr key={uni.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{uni.name}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{uni.country}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{uni.city || "-"}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                            <span className="badge" style={{ background: uni.selectivity_band === "Very High" ? "var(--error)" : uni.selectivity_band === "High" ? "var(--warning)" : "var(--success)", color: "#fff" }}>
                              {uni.selectivity_band || "-"}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                className="button ghost"
                                onClick={() => {
                                  setEditingUniversity(uni); // Set to university object for editing
                                  setUniversityForm({
                                    name: uni.name || "",
                                    country: uni.country || "",
                                    city: uni.city || "",
                                    selectivity_band: uni.selectivity_band || "",
                                    major_tags: uni.major_tags || ""
                                  });
                                }}
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                              >
                                Edit
                              </button>
                              <button
                                className="button ghost"
                                onClick={() => deleteUniversity(uni.id)}
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--error)" }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
