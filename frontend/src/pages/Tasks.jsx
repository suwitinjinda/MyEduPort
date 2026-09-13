import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { EmptyState } from "../components/Skeleton.jsx";
import Skeleton from "../components/Skeleton.jsx";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic" },
  { value: "testing", label: "Testing" },
  { value: "essay", label: "Essay" },
  { value: "application", label: "Application" },
  { value: "recommendation", label: "Recommendation" },
  { value: "financial", label: "Financial Aid" }
];

const SEEDS = [
  { title: "Register for SAT in May", category: "testing", offset_days: 14 },
  { title: "Draft Common App personal statement (650w)", category: "essay", offset_days: 60 },
  { title: "Ask 2 teachers for recommendation letters", category: "recommendation", offset_days: 30 },
  { title: "Finalize college list (8–12 schools)", category: "application", offset_days: 45 },
  { title: "Complete FAFSA / CSS Profile", category: "financial", offset_days: 90 },
  { title: "Submit early decision application (Nov 1)", category: "application", offset_days: 120 }
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", due_date: "", category: "general", notes: "" });
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch("/api/students/me/tasks");
      setTasks(data || []);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    try {
      await apiFetch("/api/students/me/tasks", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", due_date: "", category: "general", notes: "" });
      load();
    } catch (err) {
      setStatus(err.message);
    }
  };

  const toggleStatus = async (task) => {
    const next = task.status === "done" ? "open" : task.status === "open" ? "in_progress" : "done";
    await apiFetch(`/api/students/me/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ status: next }) });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await apiFetch(`/api/students/me/tasks/${id}`, { method: "DELETE" });
    load();
  };

  const seedDefaults = async () => {
    setStatus("Seeding…");
    for (const s of SEEDS) {
      const due = new Date(Date.now() + s.offset_days * 86400000).toISOString().split("T")[0];
      await apiFetch("/api/students/me/tasks", {
        method: "POST",
        body: JSON.stringify({ title: s.title, category: s.category, due_date: due })
      });
    }
    setStatus("");
    load();
  };

  const visibleTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const byStatus = {
    open: tasks.filter((t) => t.status === "open").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Tasks · Application Checklist</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Stay on schedule.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "62ch" }}>
          Track every milestone — from test registration to submitting early
          decision. Order by deadline; never miss a date.
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }} className="tasks-grid">
        {/* Add form */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Add a task</h2>
          <form onSubmit={add}>
            <div className="input">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Register for SAT in May" />
            </div>
            <div className="grid two">
              <div className="input">
                <label>Due date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="input">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="input">
              <label>Notes (optional)</label>
              <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button className="button" type="submit">Add task</button>
          </form>

          {tasks.length === 0 && !loading && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--surface-warm)", borderLeft: "2px solid var(--gold)" }}>
              <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.4rem" }}>Quick start</div>
              <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "0.75rem" }}>
                Add a starter set of 6 admissions tasks based on the standard timeline.
              </p>
              <button className="button gold" type="button" onClick={seedDefaults}>
                Seed default checklist
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div>
          <div className="flex-between" style={{ marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 0 }}>Your tasks</h2>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {[
                { id: "all", label: `All · ${tasks.length}` },
                { id: "open", label: `Open · ${byStatus.open}` },
                { id: "in_progress", label: `In progress · ${byStatus.in_progress}` },
                { id: "done", label: `Done · ${byStatus.done}` }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    background: filter === f.id ? "var(--ink)" : "transparent",
                    color: filter === f.id ? "var(--paper)" : "var(--ink-muted)",
                    border: "1px solid var(--rule)",
                    fontFamily: "inherit",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer"
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <Skeleton lines={6} />
          ) : visibleTasks.length === 0 ? (
            <EmptyState
              title={filter === "all" ? "No tasks yet." : `No tasks in ${filter.replace("_", " ")}.`}
              hint="Use the form on the left or seed the default admissions checklist."
            />
          ) : (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {visibleTasks.map((t) => (
                <article key={t.id} className="card compact" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.85rem", alignItems: "start" }}>
                  <button
                    onClick={() => toggleStatus(t)}
                    title={`Mark ${t.status === "done" ? "open" : "next status"}`}
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: `2px solid ${t.status === "done" ? "var(--success)" : t.status === "in_progress" ? "var(--gold-deep)" : "var(--rule)"}`,
                      background: t.status === "done" ? "var(--success)" : "transparent",
                      color: t.status === "done" ? "var(--paper)" : "transparent",
                      cursor: "pointer",
                      fontSize: "12px",
                      lineHeight: "18px",
                      marginTop: "2px"
                    }}
                  >
                    {t.status === "done" ? "✓" : t.status === "in_progress" ? "·" : ""}
                  </button>

                  <div>
                    <div style={{ fontFamily: "var(--font-display)", color: "var(--ink)", fontWeight: 600, fontSize: "1rem", textDecoration: t.status === "done" ? "line-through" : "none", opacity: t.status === "done" ? 0.6 : 1 }}>
                      {t.title}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap", alignItems: "baseline" }}>
                      {t.due_date && (
                        <span style={{ fontSize: "0.75rem", color: daysUntil(t.due_date) < 0 && t.status !== "done" ? "var(--error)" : "var(--ink-muted)", fontWeight: 600 }}>
                          Due {new Date(t.due_date).toLocaleDateString()}
                          {t.status !== "done" && ` · ${daysUntil(t.due_date) >= 0 ? `${daysUntil(t.due_date)}d left` : `${Math.abs(daysUntil(t.due_date))}d overdue`}`}
                        </span>
                      )}
                      <span className="badge">{t.category}</span>
                    </div>
                    {t.notes && <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>{t.notes}</p>}
                  </div>

                  <button className="button ghost" onClick={() => remove(t.id)} style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem", color: "var(--error)", borderColor: "var(--error)" }}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <Link to="/guide#timeline" style={{ color: "var(--gold-deep)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          See the full Grade 9 → Senior spring timeline →
        </Link>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .tasks-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function daysUntil(date) {
  const target = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}
