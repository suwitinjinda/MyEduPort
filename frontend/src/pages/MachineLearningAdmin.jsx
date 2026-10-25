import React, { useEffect, useState } from "react";
import { apiFetch, apiUpload } from "../api/client";
import { fmtDate } from "../utils/date.js";

// Admin → Machine Learning
//  · Knowledge base: documents (papers, guides) MEPAi & EduBot read as shared context
//  · Test search: see which passages the AI would receive for a question
//  · Admission outcomes: real application results (from students or entered here)
const API = "/api/admin/ml";
const small = { padding: "0.35rem 0.8rem", fontSize: "0.75rem" };
const fmt = (d) => (d ? fmtDate(d) : "—");

export default function MachineLearningAdmin() {
  const [view, setView] = useState("kb");
  return (
    <div>
      <div className="card" style={{ marginBottom: "1.25rem", padding: "1.1rem 1.4rem", background: "var(--surface-warm)" }}>
        <strong style={{ color: "var(--ink)" }}>How this works</strong>
        <p className="muted" style={{ fontSize: "0.86rem", margin: "0.3rem 0 0" }}>
          Upload papers and guides you trust. MyEduPort splits them into passages and, every time MEPAi or EduBot answers,
          finds the passages most relevant to that student's question and gives them to the AI as reference material.
          Changes apply immediately — turn a document off or delete it and the AI stops using it. Application results
          reported by students (and any you add) are used as “students like you” evidence for acceptance predictions.
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {[["kb", "Knowledge base"], ["search", "Test search"], ["outcomes", "Admission outcomes"]].map(([k, l]) => (
          <button key={k} type="button" className={view === k ? "button" : "button ghost"} style={small} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>
      {view === "kb" ? <KnowledgeBase /> : view === "search" ? <TestSearch /> : <Outcomes />}
    </div>
  );
}

// ---------------- Knowledge base ----------------
function KnowledgeBase() {
  const [docs, setDocs] = useState(null);
  const [mode, setMode] = useState("file");
  const [form, setForm] = useState({ title: "", source: "", text: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });
  const [preview, setPreview] = useState({}); // { [docId]: chunks[] }

  const load = () => apiFetch(`${API}/documents`).then(setDocs).catch((e) => setMsg({ text: e.message, error: true }));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg({ text: "", error: false });
    try {
      let r;
      if (mode === "file") {
        if (!file) throw new Error("Choose a file first.");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", form.title);
        fd.append("source", form.source);
        r = await apiUpload(`${API}/documents`, fd);
      } else {
        r = await apiFetch(`${API}/documents/text`, { method: "POST", body: JSON.stringify(form) });
      }
      setMsg({ text: r.status === "ready" ? `Added — ${r.chunks} passages indexed. The AI can use it now.` : `Couldn't read it: ${r.error}`, error: r.status !== "ready" });
      setForm({ title: "", source: "", text: "" }); setFile(null);
      load();
    } catch (err) { setMsg({ text: err.message, error: true }); } finally { setBusy(false); }
  };
  const toggle = async (d) => { await apiFetch(`${API}/documents/${d.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !d.enabled }) }).catch(() => {}); load(); };
  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.title}"? The AI will stop using it.`)) return;
    await apiFetch(`${API}/documents/${d.id}`, { method: "DELETE" }).catch(() => {});
    load();
  };
  const showChunks = async (d) => {
    if (preview[d.id]) { setPreview((p) => ({ ...p, [d.id]: null })); return; }
    const rows = await apiFetch(`${API}/documents/${d.id}/chunks`).catch(() => []);
    setPreview((p) => ({ ...p, [d.id]: rows }));
  };

  const totalChunks = (docs || []).filter((d) => d.enabled && d.status === "ready").reduce((n, d) => n + d.chunk_count, 0);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <form className="card" onSubmit={add}>
        <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>Add a document</h2>
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.9rem" }}>
          <button type="button" className={mode === "file" ? "button" : "button ghost"} style={small} onClick={() => setMode("file")}>Upload file</button>
          <button type="button" className={mode === "text" ? "button" : "button ghost"} style={small} onClick={() => setMode("text")}>Paste text</button>
        </div>
        <div className="grid two">
          <div className="input"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={mode === "file" ? "Defaults to the file name" : "e.g. NACAC State of College Admission 2025"} /></div>
          <div className="input"><label>Source / citation (optional)</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="URL, journal, author, year" /></div>
        </div>
        {mode === "file" ? (
          <div className="input">
            <label>File <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(PDF, DOCX, TXT, MD or CSV · max 25MB · text-based PDFs only, not scans)</span></label>
            <input type="file" accept=".pdf,.docx,.txt,.md,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        ) : (
          <div className="input"><label>Text</label><textarea rows={8} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Paste an article, policy, research summary…" /></div>
        )}
        {msg.text && <p style={{ fontSize: "0.85rem", color: msg.error ? "var(--error)" : "var(--success)" }}>{msg.text}</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? "Reading & indexing…" : "Add to knowledge base"}</button>
      </form>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: 0 }}>Documents</h2>
          <span className="muted" style={{ fontSize: "0.82rem" }}>{(docs || []).length} documents · {totalChunks} passages in use</span>
        </div>
        {!docs ? <p className="muted">Loading…</p> : docs.length === 0 ? <p className="muted">No documents yet.</p> : (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {docs.map((d) => (
              <div key={d.id} style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: "0.8rem 1rem", opacity: d.enabled ? 1 : 0.6 }}>
                <div className="flex-between" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ color: "var(--ink)" }}>{d.title}</strong>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {d.source ? `${d.source} · ` : ""}{d.original_name || "pasted text"} · added {fmt(d.created_at)}
                    </div>
                    <div style={{ fontSize: "0.78rem", marginTop: "0.2rem" }}>
                      {d.status === "ready"
                        ? <span style={{ color: "var(--success)" }}>● {d.chunk_count} passages · {(d.chars / 1000).toFixed(1)}k characters</span>
                        : d.status === "failed" ? <span style={{ color: "var(--error)" }}>● Failed: {d.error}</span> : <span className="muted">● Processing…</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    {d.status === "ready" && (
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={!!d.enabled} onChange={() => toggle(d)} /> AI uses it
                      </label>
                    )}
                    {d.status === "ready" && <button type="button" className="button ghost" style={small} onClick={() => showChunks(d)}>{preview[d.id] ? "Hide" : "Preview"}</button>}
                    <button type="button" className="button ghost" style={{ ...small, color: "var(--error)" }} onClick={() => remove(d)}>Delete</button>
                  </div>
                </div>
                {preview[d.id] && (
                  <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.4rem" }}>
                    {preview[d.id].map((c) => (
                      <div key={c.idx} style={{ fontSize: "0.78rem", color: "var(--ink-soft)", background: "var(--paper-warm)", padding: "0.5rem 0.65rem", borderRadius: 6, whiteSpace: "pre-wrap" }}>
                        <strong>Passage {c.idx + 1}:</strong> {c.content.slice(0, 400)}{c.content.length > 400 ? "…" : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Test search ----------------
function TestSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState(null);
  const run = async (e) => { e.preventDefault(); setHits(await apiFetch(`${API}/search?q=${encodeURIComponent(q)}`).catch(() => [])); };
  return (
    <div className="card">
      <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Test search</h2>
      <p className="muted" style={{ fontSize: "0.85rem" }}>Type a student-style question to see which passages the AI would receive.</p>
      <form onSubmit={run} style={{ display: "flex", gap: "0.5rem", margin: "0.75rem 0 1rem" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. How important are extracurricular activities for MIT?" style={{ flex: 1 }} />
        <button className="button" type="submit" disabled={!q.trim()}>Search</button>
      </form>
      {hits && (hits.length === 0 ? <p className="muted">No matching passages — the AI would answer from its built-in guide only.</p> : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {hits.map((h, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: "0.7rem 0.9rem" }}>
              <div className="flex-between" style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                <strong style={{ color: "var(--ink)" }}>[{i + 1}] {h.title}</strong>
                <span className="muted">relevance {Number(h.score).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", whiteSpace: "pre-wrap" }}>{h.content.slice(0, 600)}{h.content.length > 600 ? "…" : ""}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------- Admission outcomes ----------------
const EMPTY = { university_name: "", result: "admitted", cycle_year: new Date().getFullYear(), application_round: "", major: "", gpa: "", tests: "", activities: "", awards: "", notes: "" };
const RESULT_BG = { admitted: "var(--success-soft)", enrolled: "var(--success-soft)", waitlisted: "var(--warn-soft)", deferred: "var(--warn-soft)", rejected: "var(--error-soft)" };

function Outcomes() {
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState([]);
  const [unis, setUnis] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const load = () => {
    apiFetch(`${API}/outcomes`).then(setRows).catch(() => setRows([]));
    apiFetch(`${API}/outcomes/stats`).then(setStats).catch(() => {});
  };
  useEffect(() => { load(); apiFetch("/api/universities").then((u) => setUnis(Array.isArray(u) ? u : [])).catch(() => {}); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const add = async (e) => {
    e.preventDefault();
    try { await apiFetch(`${API}/outcomes`, { method: "POST", body: JSON.stringify(form) }); setForm(EMPTY); setMsg("Added."); load(); } catch (err) { setMsg(err.message); }
  };
  const remove = async (r) => { if (!window.confirm("Delete this result?")) return; await apiFetch(`${API}/outcomes/${r.id}`, { method: "DELETE" }).catch(() => {}); load(); };

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="card">
        <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Results by university</h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>Students report results on their college list (Compare page). Each result keeps a snapshot of their profile at that time.</p>
        {stats.length === 0 ? <p className="muted">No results yet.</p> : (
          <div className="table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.85rem" }}>
              <thead><tr><th style={{ textAlign: "left" }}>University</th><th>Applicants</th><th>Admitted</th><th>Waitlisted / deferred</th><th>Rejected</th></tr></thead>
              <tbody>{stats.map((s) => <tr key={s.university_name}><td>{s.university_name}</td><td style={{ textAlign: "center" }}>{s.total}</td><td style={{ textAlign: "center" }}>{s.admitted}</td><td style={{ textAlign: "center" }}>{s.waitlisted}</td><td style={{ textAlign: "center" }}>{s.rejected}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      <form className="card" onSubmit={add}>
        <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>Add a result (e.g. alumni or past students)</h2>
        <div className="grid two">
          <div className="input">
            <label>University</label>
            <input list="ml-unis" value={form.university_name} onChange={set("university_name")} required placeholder="Start typing…" />
            <datalist id="ml-unis">{unis.map((u) => <option key={u.id} value={u.name} />)}</datalist>
          </div>
          <div className="input">
            <label>Result</label>
            <select value={form.result} onChange={set("result")}>{["admitted", "waitlisted", "deferred", "rejected", "enrolled"].map((r) => <option key={r} value={r}>{r}</option>)}</select>
          </div>
        </div>
        <div className="grid three">
          <div className="input"><label>Entry year</label><input type="number" value={form.cycle_year} onChange={set("cycle_year")} /></div>
          <div className="input"><label>Round</label><input value={form.application_round} onChange={set("application_round")} placeholder="ED / EA / RD / UCAS" /></div>
          <div className="input"><label>Major</label><input value={form.major} onChange={set("major")} /></div>
        </div>
        <div className="grid three">
          <div className="input"><label>GPA (4.0 scale)</label><input value={form.gpa} onChange={set("gpa")} placeholder="3.9" /></div>
          <div className="input"><label>Tests</label><input value={form.tests} onChange={set("tests")} placeholder="SAT 1540, IELTS 8.0" /></div>
          <div className="input"><label># Activities / # Awards</label>
            <div style={{ display: "flex", gap: "0.4rem" }}><input value={form.activities} onChange={set("activities")} placeholder="6" /><input value={form.awards} onChange={set("awards")} placeholder="3" /></div>
          </div>
        </div>
        <div className="input"><label>Notes (optional)</label><input value={form.notes} onChange={set("notes")} placeholder="Anything that stood out in this application" /></div>
        {msg && <p style={{ fontSize: "0.85rem" }}>{msg}</p>}
        <button className="button" type="submit">Add result</button>
      </form>

      <div className="card">
        <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>All results</h2>
        {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No results yet.</p> : (
          <div className="table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "760px", fontSize: "0.82rem" }}>
              <thead><tr><th style={{ textAlign: "left" }}>University</th><th>Result</th><th>Year</th><th>Round</th><th style={{ textAlign: "left" }}>Applicant</th><th style={{ textAlign: "left" }}>Profile at the time</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const p = r.profile_snapshot || {};
                  return (
                    <tr key={r.id}>
                      <td>{r.university_name}</td>
                      <td style={{ textAlign: "center" }}><span className="badge" style={{ background: RESULT_BG[r.result] }}>{r.result}</span></td>
                      <td style={{ textAlign: "center" }}>{r.cycle_year || "—"}</td>
                      <td style={{ textAlign: "center" }}>{r.application_round || "—"}</td>
                      <td>{r.source === "admin" ? <span className="muted">added by admin</span> : `${r.student_name || "—"}`}</td>
                      <td className="muted">{[p.gpa ? `GPA ${p.gpa}` : null, (p.tests || []).join(", ") || null, p.activities != null ? `${p.activities} activities` : null, p.awards != null ? `${p.awards} awards` : null].filter(Boolean).join(" · ") || "—"}</td>
                      <td><button type="button" className="button ghost" style={{ padding: "0.2rem 0.55rem", fontSize: "0.7rem", color: "var(--error)" }} onClick={() => remove(r)}>Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
