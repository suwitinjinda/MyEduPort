import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import EmailMarketing from "./EmailMarketing.jsx";
import MachineLearningAdmin from "./MachineLearningAdmin.jsx";
import BackupAdmin from "./BackupAdmin.jsx";
import AffiliateAdmin from "./AffiliateAdmin.jsx";
import CoinsAdmin from "./CoinsAdmin.jsx";
import CampaignsAdmin from "./CampaignsAdmin.jsx";
import { fmtDateTime } from "../utils/date.js";

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
  const [planDisplay, setPlanDisplay] = useState(null); // { [tier]: { visible, monthly, annual } } — Pricing page
  const TIERS = ["free", "essential", "professional", "elite"];
  const [savingLimits, setSavingLimits] = useState(false);
  const [advisorSessions, setAdvisorSessions] = useState([]);

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
      if (activeTab === "advisor") setAdvisorSessions(await apiFetch("/api/admin/advisor-sessions").catch(() => []));
      if (activeTab === "settings") {
        const d = await apiFetch("/api/admin/settings/plan-limits").catch(() => null);
        if (d) { setPlanLimits(d.limits); setPlanDisplay(d.display || null); }
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
      await apiFetch("/api/admin/settings/plan-limits", { method: "PUT", body: JSON.stringify({ limits: planLimits, display: planDisplay }) });
      setStatus("Plan limits saved");
    } catch (err) { setStatus(err.message); }
    finally { setSavingLimits(false); }
  };
  const updateAdvisorSession = async (row, patch) => {
    const next = { ...row, ...patch };
    try {
      await apiFetch(`/api/admin/advisor-sessions/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: next.status, scheduled_at: next.scheduled_at || null, meeting_link: next.meeting_link || "", admin_note: next.admin_note || "" })
      });
      setStatus("Advisor session updated");
      loadData();
    } catch (err) { setStatus(err.message); }
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
    { id: "ml", label: "Machine Learning" },
    { id: "email", label: "Email Marketing" },
    { id: "campaigns", label: "Campaigns" },
    { id: "lists", label: "Dropdown Lists" },
    { id: "advisor", label: "Advisor Sessions" },
    { id: "settings", label: "Plan Settings" },
    { id: "affiliates", label: "Affiliates" },
    { id: "coins", label: "Coins" },
    { id: "backup", label: "Backups" }
  ];

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Admin Console</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Manage users and the university database.
        </h1>
      </header>

      {/* Twelve tabs no longer fit one row at desktop width — wrap instead of pushing the page sideways */}
      <nav style={{ display: "flex", flexWrap: "wrap", gap: "0", borderBottom: "1px solid var(--rule)", marginBottom: "2rem" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "0.85rem 1rem",
              whiteSpace: "nowrap",
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
              <div className="table-scroll" style={{ overflowX: "auto" }}>
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
                            <option value="elite">elite</option>
                          </select>
                          {(u.plan || "free") === "free" && u.trial_ends_at && (
                            new Date(u.trial_ends_at) > new Date()
                              ? <div style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 600, marginTop: "0.2rem" }}>Trial · {Math.ceil((new Date(u.trial_ends_at) - new Date()) / 86400000)}d left</div>
                              : <div className="muted" style={{ fontSize: "0.7rem", marginTop: "0.2rem" }}>Trial ended</div>
                          )}
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
              <div className="table-scroll" style={{ overflowX: "auto" }}>
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

                <div className="table-scroll" style={{ overflowX: "auto" }}>
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

          {activeTab === "ml" && <MachineLearningAdmin />}

          {activeTab === "affiliates" && <AffiliateAdmin />}
          {activeTab === "coins" && <CoinsAdmin />}
          {activeTab === "campaigns" && <CampaignsAdmin />}
          {activeTab === "backup" && <BackupAdmin />}

          {activeTab === "email" && <EmailMarketing />}

          {activeTab === "lists" && <OptionListsAdmin onGoUniversities={() => setActiveTab("universities")} setStatus={setStatus} />}

          {activeTab === "advisor" && (
            <div className="card">
              <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.25rem" }}>Human Advisor Session requests</h2>
              <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                Professional students can request 1 session per month. Set a time and meeting link, then mark it Scheduled — the student sees it on their dashboard. Cancelling gives the student their session back.
              </p>
              {advisorSessions.length === 0 ? (
                <p className="muted">No requests yet.</p>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {advisorSessions.map((a) => <AdvisorRow key={a.id} row={a} onSave={updateAdvisorSession} />)}
                </div>
              )}
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
                  <div className="table-scroll" style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr><th>Feature</th>{TIERS.map((t) => <th key={t} style={{ textTransform: "capitalize" }}>{t}</th>)}</tr>
                      </thead>
                      <tbody>
                        {/* Pricing page: show/hide + prices */}
                        <tr style={{ background: "var(--surface-warm)" }}>
                          <td style={{ fontSize: "0.85rem", fontWeight: 700 }}>Show on Pricing page</td>
                          {TIERS.map((tier) => (
                            <td key={tier}>
                              <input
                                type="checkbox"
                                disabled={tier === "free" || !planDisplay}
                                checked={!!planDisplay?.[tier]?.visible}
                                onChange={(e) => setPlanDisplay((p) => ({ ...p, [tier]: { ...p[tier], visible: e.target.checked } }))}
                                title={tier === "free" ? "The Free plan is always shown" : "Show or hide this plan on the Pricing page"}
                                style={{ accentColor: "var(--gold-deep)", width: "18px", height: "18px" }}
                              />
                              {planDisplay && !planDisplay[tier]?.visible && <span className="muted" style={{ fontSize: "0.72rem", marginLeft: "0.35rem" }}>hidden</span>}
                            </td>
                          ))}
                        </tr>
                        {[["monthly", "Price per month (USD)"], ["annual", "Price per year (USD)"]].map(([k, label]) => (
                          <tr key={k} style={{ background: "var(--surface-warm)" }}>
                            <td style={{ fontSize: "0.85rem", fontWeight: 700 }}>{label}</td>
                            {TIERS.map((tier) => (
                              <td key={tier}>
                                {tier === "free" ? <span className="muted" style={{ fontSize: "0.8rem" }}>$0</span> : (
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={planDisplay?.[tier]?.[k] ?? ""}
                                    onChange={(e) => setPlanDisplay((p) => ({ ...p, [tier]: { ...p[tier], [k]: e.target.value } }))}
                                    style={{ width: "80px", padding: "0.3rem 0.4rem", fontSize: "0.8rem" }}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {[
                          { key: "adviai", label: "MEPAi — AI portfolio builder", type: "bool" },
                          { key: "essay_feedback", label: "MEPAi Essay Score (free=lifetime, paid=/mo)", type: "num" },
                          { key: "match", label: "MEPAi University Match (# universities shown)", type: "num" },
                          { key: "prediction", label: "Acceptance Prediction", type: "select", options: ["none", "basic", "advanced"] },
                          { key: "parent_dashboard", label: "Parent Dashboard", type: "bool" },
                          { key: "export", label: "Export PDF Portfolio", type: "bool" },
                          { key: "advisor", label: "Human Advisor Sessions (/mo)", type: "num" },
                          { key: "gap", label: "Gap analysis", type: "bool" },
                          { key: "edubot", label: "EduBot questions (free=lifetime, paid=/mo)", type: "num" }
                        ].map((f) => (
                          <tr key={f.key}>
                            <td style={{ fontSize: "0.85rem" }}>{f.label}</td>
                            {TIERS.map((tier) => (
                              <td key={tier}>
                                {f.type === "select" ? (
                                  <select
                                    value={planLimits[tier]?.[f.key] || "none"}
                                    onChange={(e) => updateLimit(tier, f.key, e.target.value)}
                                    style={{ padding: "0.3rem 0.4rem", fontSize: "0.8rem" }}
                                  >
                                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : f.type === "bool" ? (
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

// Local datetime-local value (YYYY-MM-DDTHH:mm) from a DB timestamp
function toLocalInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdvisorRow({ row, onSave }) {
  const [draft, setDraft] = useState({
    status: row.status,
    scheduled_at: toLocalInput(row.scheduled_at),
    meeting_link: row.meeting_link || "",
    admin_note: row.admin_note || ""
  });
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const save = () => onSave(row, { ...draft, scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null });
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: "1rem" }}>
      <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <div>
          <strong style={{ color: "var(--ink)" }}>{row.topic}</strong>
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            {row.student_name} · {row.student_email} · {row.student_plan} · requested {fmtDateTime(row.created_at)}
          </div>
        </div>
        <span className="badge">{row.status}</span>
      </div>
      {row.details && <p style={{ fontSize: "0.88rem", margin: "0 0 0.4rem", whiteSpace: "pre-wrap" }}>{row.details}</p>}
      {row.preferred_times && <p className="muted" style={{ fontSize: "0.85rem", margin: "0 0 0.75rem" }}>Preferred: {row.preferred_times}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem", alignItems: "end" }}>
        <label style={{ fontSize: "0.78rem" }}>Status
          <select value={draft.status} onChange={set("status")} style={{ width: "100%" }}>
            {["requested", "scheduled", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.78rem" }}>Date &amp; time
          <input type="datetime-local" value={draft.scheduled_at} onChange={set("scheduled_at")} style={{ width: "100%" }} />
        </label>
        <label style={{ fontSize: "0.78rem" }}>Meeting link
          <input value={draft.meeting_link} onChange={set("meeting_link")} placeholder="https://meet.google.com/…" style={{ width: "100%" }} />
        </label>
        <label style={{ fontSize: "0.78rem" }}>Note to student
          <input value={draft.admin_note} onChange={set("admin_note")} style={{ width: "100%" }} />
        </label>
        <button className="button" onClick={save} style={{ padding: "0.5rem 1rem" }}>Save</button>
      </div>
    </div>
  );
}

// ---- Dropdown Lists: the options students pick from on their Portfolio pages ----
const OPTION_LISTS = [
  { key: "universities", label: "Personal › Intended Universities" },
  { key: "majors", label: "Personal › Intended Majors" },
  { key: "curriculums", label: "Academics › Curriculums" },
  { key: "subjects", label: "Academics › Subjects" },
  { key: "tests", label: "Academics › Section II › Tests" }
];

function OptionListsAdmin({ onGoUniversities, setStatus }) {
  const [data, setData] = useState(null); // { lists, defaults }
  const [active, setActive] = useState("majors");
  const [groups, setGroups] = useState([]);
  const [newItem, setNewItem] = useState({}); // { [groupIndex]: text }
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { apiFetch("/api/admin/option-lists").then(setData).catch((e) => setStatus(e.message)); }, []);
  useEffect(() => {
    if (data && active !== "universities") {
      setGroups(JSON.parse(JSON.stringify(data.lists[active] || [])));
      setNewItem({});
      setDirty(false);
    }
  }, [data, active]);

  const edit = (fn) => { setGroups((g) => fn(JSON.parse(JSON.stringify(g)))); setDirty(true); };
  const addItem = (gi) => {
    const v = (newItem[gi] || "").trim();
    if (!v) return;
    if (groups.some((g) => g.options.some((o) => o.toLowerCase() === v.toLowerCase()))) { setStatus(`"${v}" is already in this list`); return; }
    edit((g) => { g[gi].options.push(v); return g; });
    setNewItem((n) => ({ ...n, [gi]: "" }));
  };
  const save = async () => {
    setSaving(true);
    try {
      const r = await apiFetch(`/api/admin/option-lists/${active}`, { method: "PUT", body: JSON.stringify({ groups }) });
      setData((d) => ({ ...d, lists: r.lists }));
      setStatus("List saved — students see it on their next page load");
    } catch (err) { setStatus(err.message); } finally { setSaving(false); }
  };
  const switchTo = (key) => {
    if (dirty && !window.confirm("Discard unsaved changes to this list?")) return;
    setActive(key);
  };

  return (
    <div className="card">
      <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.25rem" }}>Dropdown lists</h2>
      <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.25rem" }}>
        Add or remove the options students pick from on their Portfolio pages. Removing an option doesn't change what students have already saved.
      </p>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {OPTION_LISTS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => switchTo(l.key)}
            className={active === l.key ? "button" : "button ghost"}
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.78rem" }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {active === "universities" ? (
        <div style={{ padding: "1rem 1.25rem", background: "var(--surface-warm)", borderRadius: "var(--r-md)" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
            Intended Universities come from the university database. Add, edit or hide universities in the Universities tab — visible (not hidden) universities appear in the students' dropdowns.
          </p>
          <button type="button" className="button" onClick={onGoUniversities}>Open Universities →</button>
        </div>
      ) : !data ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: "1rem" }}>
            {groups.map((g, gi) => (
              <div key={gi} style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: "1rem" }}>
                <div className="flex-between" style={{ gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    Group
                    <input value={g.label} onChange={(e) => edit((x) => { x[gi].label = e.target.value; return x; })} style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }} />
                  </label>
                  <button
                    type="button"
                    className="button ghost"
                    style={{ padding: "0.3rem 0.7rem", fontSize: "0.7rem", color: "var(--error)" }}
                    onClick={() => { if (window.confirm(`Delete group "${g.label}" and its ${g.options.length} options?`)) edit((x) => x.filter((_, i) => i !== gi)); }}
                  >
                    Delete group
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  {g.options.map((o, oi) => (
                    <span key={o} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.4rem 0.25rem 0.7rem", border: "1px solid var(--rule)", borderRadius: "var(--r-full)", fontSize: "0.8rem", background: "var(--surface)" }}>
                      {o}
                      <button
                        type="button"
                        aria-label={`Remove ${o}`}
                        onClick={() => edit((x) => { x[gi].options.splice(oi, 1); return x; })}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-muted)", fontSize: "0.9rem", lineHeight: 1, padding: "0 0.2rem" }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {g.options.length === 0 && <span className="muted" style={{ fontSize: "0.8rem" }}>No options yet — empty groups are dropped on save.</span>}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); addItem(gi); }} style={{ display: "flex", gap: "0.5rem" }}>
                  <input value={newItem[gi] || ""} onChange={(e) => setNewItem((n) => ({ ...n, [gi]: e.target.value }))} placeholder="Add an option…" maxLength={120} style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.85rem" }} />
                  <button type="submit" className="button ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.75rem" }}>Add</button>
                </form>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button type="button" className="button ghost" onClick={() => edit((x) => [...x, { label: "New group", options: [] }])}>+ Add group</button>
            <button
              type="button"
              className="button ghost"
              onClick={() => { if (window.confirm("Reset this list to the built-in defaults? (Not saved until you click Save.)")) { setGroups(JSON.parse(JSON.stringify(data.defaults[active] || []))); setDirty(true); } }}
            >
              Reset to defaults
            </button>
            <button type="button" className="button" disabled={saving || !dirty} onClick={save} style={{ marginLeft: "auto" }}>
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
