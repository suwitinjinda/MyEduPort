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
  const [editingUniversity, setEditingUniversity] = useState(undefined);
  const [universityForm, setUniversityForm] = useState({ name: "", country: "", city: "", selectivity_band: "", major_tags: "", qs_rank: "", hidden: 0 });
  const [planLimits, setPlanLimits] = useState(null);
  const [savingLimits, setSavingLimits] = useState(false);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview" || activeTab === "users") {
        const [u, s] = await Promise.all([
          apiFetch("/api/admin/users").catch(() => []),
          apiFetch("/api/admin/stats").catch(() => null)
        ]);
        setUsers(u);
        setStats(s);
      }
      if (activeTab === "students") setStudents(await apiFetch("/api/admin/students").catch(() => []));
      if (activeTab === "universities") setUniversities(await apiFetch("/api/admin/universities").catch(() => []));
      if (activeTab === "settings") {
        const d = await apiFetch("/api/admin/settings/plan-limits").catch(() => null);
        if (d) setPlanLimits(d.limits);
      }
      setStatus("");
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id, current) => {
    try {
      await apiFetch(`/api/admin/users/${id}/disable`, { method: "PUT", body: JSON.stringify({ disabled: !current }) });
      loadData();
      setStatus(`User ${!current ? "disabled" : "enabled"}`);
    } catch (err) { setStatus(err.message); }
  };
  const deleteUser = async (id) => {
    if (!window.confirm("Permanently delete this user?")) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      loadData();
      setStatus("User deleted");
    } catch (err) { setStatus(err.message); }
  };
  const setUserPlan = async (id, plan) => {
    try {
      await apiFetch(`/api/admin/users/${id}/plan`, { method: "PUT", body: JSON.stringify({ plan }) });
      loadData();
      setStatus(`Plan set to ${plan}`);
    } catch (err) { setStatus(err.message); }
  };
  const updateLimit = (tier, key, value) =>
    setPlanLimits((prev) => ({ ...prev, [tier]: { ...prev[tier], [key]: value } }));
  const savePlanLimits = async () => {
    setSavingLimits(true);
    try {
      await apiFetch("/api/admin/settings/plan-limits", { method: "PUT", body: JSON.stringify({ limits: planLimits }) });
      setStatus("Plan limits saved");
    } catch (err) { setStatus(err.message); }
    finally { setSavingLimits(false); }
  };
  const saveUniversity = async () => {
    if (!universityForm.name || !universityForm.country) { setStatus("Name and Country are required"); return; }
    try {
      if (editingUniversity && editingUniversity !== null) {
        await apiFetch(`/api/admin/universities/${editingUniversity.id}`, { method: "PUT", body: JSON.stringify(universityForm) });
        setStatus("University updated");
      } else {
        await apiFetch("/api/admin/universities", { method: "POST", body: JSON.stringify(universityForm) });
        setStatus("University created");
      }
      setEditingUniversity(undefined);
      setUniversityForm({ name: "", country: "", city: "", selectivity_band: "", major_tags: "", qs_rank: "", hidden: 0 });
      loadData();
    } catch (err) { setStatus(`Error: ${err.message}`); }
  };
  const deleteUniversity = async (id) => {
    if (!window.confirm("Delete this university?")) return;
    try { await apiFetch(`/api/admin/universities/${id}`, { method: "DELETE" }); loadData(); setStatus("Deleted"); }
    catch (err) { setStatus(err.message); }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "students", label: "Students" },
    { id: "universities", label: "Universities" },
    { id: "settings", label: "Plan Settings" }
  ];

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Admin Console</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Manage users and the university database.
        </h1>
      </header>

      <nav style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--rule)", marginBottom: "2rem" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "0.85rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === t.id ? "2px solid var(--gold)" : "2px solid transparent",
              color: activeTab === t.id ? "var(--ink)" : "var(--ink-muted)",
              fontWeight: activeTab === t.id ? 600 : 500,
              fontFamily: "inherit",
              fontSize: "0.85rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              marginBottom: "-1px"
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {status && (
        <div
          className="card compact"
          style={{
            marginBottom: "1.5rem",
            borderLeft: `2px solid ${status.toLowerCase().includes("error") ? "var(--error)" : "var(--success)"}`,
            background: status.toLowerCase().includes("error") ? "var(--error-soft)" : "var(--success-soft)"
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: status.toLowerCase().includes("error") ? "var(--error)" : "var(--success)" }}>
            {status}
          </p>
        </div>
      )}

      {loading ? (
        <div className="card"><p className="muted">Loading…</p></div>
      ) : (
        <>
          {activeTab === "overview" && stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="value">{stats.users}</div>
                <div className="label">Total users</div>
                <div className="text-muted" style={{ marginTop: "0.5rem" }}>{stats.students} students · {stats.parents} parents</div>
              </div>
              <div className="stat-card">
                <div className="value">{stats.universities}</div>
                <div className="label">Universities</div>
              </div>
              <div className="stat-card">
                <div className="value" style={{ color: stats.disabled > 0 ? "var(--error)" : "var(--success)" }}>{stats.disabled}</div>
                <div className="label">Disabled accounts</div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="card">
              <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>User management</h2>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Consent</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><span className="badge">{u.role}</span></td>
                        <td>
                          <select
                            value={u.plan || "free"}
                            onChange={(e) => setUserPlan(u.id, e.target.value)}
                            style={{ padding: "0.25rem 0.4rem", fontSize: "0.75rem" }}
                          >
                            <option value="free">free</option>
                            <option value="essential">essential</option>
                            <option value="professional">professional</option>
                          </select>
                        </td>
                        <td style={{ color: u.data_consent ? "var(--success)" : "var(--error)", fontWeight: 600 }}>{u.data_consent ? "Yes" : "No"}</td>
                        <td>{u.is_disabled ? <span className="badge" style={{ background: "var(--error-soft)", color: "var(--error)" }}>Disabled</span> : <span className="badge success">Active</span>}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="button ghost" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => toggleUserStatus(u.id, u.is_disabled)}>
                              {u.is_disabled ? "Enable" : "Disable"}
                            </button>
                            <button className="button ghost" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem", color: "var(--error)", borderColor: "var(--error)" }} onClick={() => deleteUser(u.id)}>
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

          {activeTab === "students" && (
            <div className="card">
              <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "1rem" }}>Students overview</h2>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Grade</th><th>School</th><th>Records</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{s.email}</td>
                        <td>{s.grade_level || "—"}</td>
                        <td>{s.school || "—"}</td>
                        <td className="text-muted">
                          {s.academics_count} academic · {s.activities_count} act · {s.tests_count} tests · {s.awards_count} awards
                        </td>
                        <td>{s.is_disabled ? <span className="badge" style={{ background: "var(--error-soft)", color: "var(--error)" }}>Disabled</span> : <span className="badge success">Active</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "universities" && (
            <div>
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="flex-between" style={{ marginBottom: "1rem" }}>
                  <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: 0 }}>University database</h2>
                  <button
                    className="button gold"
                    onClick={() => {
                      setEditingUniversity(null);
                      setUniversityForm({ name: "", country: "", city: "", selectivity_band: "", major_tags: "", qs_rank: "", hidden: 0 });
                    }}
                  >
                    + Add university
                  </button>
                </div>

                {editingUniversity !== undefined && (
                  <div className="card" style={{ background: "var(--surface-warm)", padding: "1.5rem", marginBottom: "1rem" }}>
                    <h3 className="subtitle" style={{ marginBottom: "1rem" }}>
                      {editingUniversity && editingUniversity !== null ? "Edit university" : "New university"}
                    </h3>
                    <div className="grid two">
                      <div className="input">
                        <label>Name *</label>
                        <input value={universityForm.name} onChange={(e) => setUniversityForm({ ...universityForm, name: e.target.value })} placeholder="Harvard University" />
                      </div>
                      <div className="input">
                        <label>Country *</label>
                        <select value={universityForm.country} onChange={(e) => setUniversityForm({ ...universityForm, country: e.target.value })}>
                          <option value="">Select</option>
                          <option value="US">United States</option>
                          <option value="UK">United Kingdom</option>
                          <option value="Australia">Australia</option>
                          <option value="China">China</option>
                          <option value="Canada">Canada</option>
                          <option value="Hong Kong">Hong Kong</option>
                          <option value="Singapore">Singapore</option>
                          <option value="Japan">Japan</option>
                          <option value="Germany">Germany</option>
                        </select>
                      </div>
                      <div className="input">
                        <label>City</label>
                        <input value={universityForm.city} onChange={(e) => setUniversityForm({ ...universityForm, city: e.target.value })} />
                      </div>
                      <div className="input">
                        <label>Selectivity</label>
                        <select value={universityForm.selectivity_band} onChange={(e) => setUniversityForm({ ...universityForm, selectivity_band: e.target.value })}>
                          <option value="">Select</option>
                          <option value="Very High">Very High</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div className="input">
                        <label>QS 2026 rank</label>
                        <input type="number" value={universityForm.qs_rank ?? ""} onChange={(e) => setUniversityForm({ ...universityForm, qs_rank: e.target.value })} placeholder="e.g. 16" />
                      </div>
                      <div className="input">
                        <label>Visibility</label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 400, marginTop: "0.4rem" }}>
                          <input type="checkbox" checked={!!universityForm.hidden} onChange={(e) => setUniversityForm({ ...universityForm, hidden: e.target.checked ? 1 : 0 })} />
                          Hidden (not shown to students)
                        </label>
                      </div>
                    </div>
                    <div className="input">
                      <label>Major tags (comma-separated)</label>
                      <input value={universityForm.major_tags} onChange={(e) => setUniversityForm({ ...universityForm, major_tags: e.target.value })} placeholder="Engineering, Computer Science" />
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button className="button" onClick={saveUniversity} disabled={!universityForm.name || !universityForm.country}>
                        {editingUniversity ? "Update" : "Create"}
                      </button>
                      <button className="button ghost" onClick={() => { setEditingUniversity(undefined); setUniversityForm({ name: "", country: "", city: "", selectivity_band: "", major_tags: "", qs_rank: "", hidden: 0 }); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Country</th><th>City</th><th>QS</th><th>Selectivity</th><th></th></tr>
                    </thead>
                    <tbody>
                      {universities.map((uni) => (
                        <tr key={uni.id}>
                          <td><strong>{uni.name}</strong>{uni.hidden ? <span className="badge" style={{ marginLeft: "0.4rem", background: "var(--warn-soft)", color: "var(--warn)" }}>hidden</span> : null}</td>
                          <td>{uni.country}</td>
                          <td>{uni.city || "—"}</td>
                          <td>{uni.qs_rank ? `#${uni.qs_rank}` : "—"}</td>
                          <td>
                            <span className="badge" style={{
                              background: uni.selectivity_band === "Very High" ? "var(--error-soft)" : uni.selectivity_band === "High" ? "var(--warn-soft)" : "var(--success-soft)",
                              color: uni.selectivity_band === "Very High" ? "var(--error)" : uni.selectivity_band === "High" ? "var(--warn)" : "var(--success)"
                            }}>
                              {uni.selectivity_band || "—"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button className="button ghost" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => { setEditingUniversity(uni); setUniversityForm({ name: uni.name || "", country: uni.country || "", city: uni.city || "", selectivity_band: uni.selectivity_band || "", major_tags: uni.major_tags || "", qs_rank: uni.qs_rank ?? "", hidden: uni.hidden ?? 0 }); }}>
                                Edit
                              </button>
                              <button className="button ghost" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem", color: "var(--error)", borderColor: "var(--error)" }} onClick={() => deleteUniversity(uni.id)}>
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

          {activeTab === "settings" && (
            <div>
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <div>
                    <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.25rem" }}>Plan limits &amp; feature gating</h2>
                    <p className="muted" style={{ fontSize: "0.88rem" }}>Toggle features and set quotas per plan. Applies immediately to all users. (−1 = unlimited, 0 = off)</p>
                  </div>
                  <button className="button" onClick={savePlanLimits} disabled={savingLimits || !planLimits}>
                    {savingLimits ? "Saving…" : "Save changes"}
                  </button>
                </div>
                {!planLimits ? (
                  <p className="muted">Loading…</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr><th>Feature</th><th>Free</th><th>Essential</th><th>Professional</th></tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "adviai", label: "AdviAI — personalized essay advice", type: "bool" },
                          { key: "export", label: "PDF export (Portfolio Report)", type: "bool" },
                          { key: "gap", label: "Gap analysis", type: "bool" },
                          { key: "predictions", label: "Acceptance predictions (# unis)", type: "num" },
                          { key: "edubot", label: "EduBot questions (free=lifetime, paid=/mo)", type: "num" },
                          { key: "essay_feedback", label: "EssAI Feedback (free=lifetime, paid=/mo)", type: "num" }
                        ].map((f) => (
                          <tr key={f.key}>
                            <td style={{ fontSize: "0.85rem" }}>{f.label}</td>
                            {["free", "essential", "professional"].map((tier) => (
                              <td key={tier}>
                                {f.type === "bool" ? (
                                  <input
                                    type="checkbox"
                                    checked={!!planLimits[tier]?.[f.key]}
                                    onChange={(e) => updateLimit(tier, f.key, e.target.checked)}
                                    style={{ accentColor: "var(--gold-deep)", width: "18px", height: "18px" }}
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    value={planLimits[tier]?.[f.key] ?? 0}
                                    onChange={(e) => updateLimit(tier, f.key, parseInt(e.target.value, 10))}
                                    style={{ width: "80px", padding: "0.3rem 0.4rem", fontSize: "0.8rem" }}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <p className="muted" style={{ fontSize: "0.82rem" }}>
                Tip: to give a user a plan, use the <strong>Users</strong> tab → Plan dropdown.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
