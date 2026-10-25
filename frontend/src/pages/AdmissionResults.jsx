import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

// Where a student records how their applications actually turned out, once results are in.
//
// These rows are the platform's only source of real outcomes: MEPAi reads them (alongside
// the profile each result came from) when it estimates anyone's chances, so a student who
// fills this in is directly improving the advice the next cohort gets. The page says so,
// because otherwise "tell us your rejections" is a strange thing to ask of someone.

const RESULT_STYLE = {
  enrolled: { label: "Enrolled", color: "var(--teal-deep)", soft: "var(--success-soft)" },
  admitted: { label: "Admitted", color: "var(--success-deep)", soft: "var(--success-soft)" },
  waitlisted: { label: "Waitlisted", color: "#b45309", soft: "#fef3c7" },
  deferred: { label: "Deferred", color: "#b45309", soft: "#fef3c7" },
  rejected: { label: "Not admitted", color: "var(--error-deep)", soft: "var(--error-soft)" }
};
const BLANK = { university_name: "", country: "", cycle_year: "", application_round: "", major: "", result: "admitted", notes: "" };

export default function AdmissionResults() {
  const [rows, setRows] = useState(null);
  const [options, setOptions] = useState({ results: [], rounds: [] });
  const [unis, setUnis] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });

  const load = () => apiFetch("/api/students/me/admission-results").then(setRows).catch((e) => setMsg({ text: e.message, error: true }));

  useEffect(() => {
    load();
    apiFetch("/api/students/me/admission-results/options").then(setOptions).catch(() => {});
    apiFetch("/api/options/universities").then((d) => setUnis(Array.isArray(d) ? d : d?.universities || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const startEdit = (r) => {
    setForm({
      university_name: r.university_name || "", country: r.country || "", cycle_year: r.cycle_year || "",
      application_round: r.application_round || "", major: r.major || "", result: r.result, notes: r.notes || ""
    });
    setEditingId(r.id);
    setOpen(true);
    setMsg({ text: "", error: false });
  };

  const cancel = () => { setForm(BLANK); setEditingId(null); setOpen(false); setMsg({ text: "", error: false }); };

  const save = async () => {
    setBusy(true); setMsg({ text: "", error: false });
    try {
      await apiFetch(
        editingId ? `/api/students/me/admission-results/${editingId}` : "/api/students/me/admission-results",
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) }
      );
      await load();
      cancel();
      setMsg({ text: editingId ? "Result updated." : "Result saved — thank you, this helps the students coming after you.", error: false });
    } catch (e) {
      setMsg({ text: e.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Remove your ${r.university_name} result?`)) return;
    try {
      await apiFetch(`/api/students/me/admission-results/${r.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "1.75rem" }}>
        <div className="eyebrow">Admission Results</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: "var(--ink)", letterSpacing: "-0.02em", marginTop: "0.4rem" }}>
          How did it go?
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "62ch" }}>
          Once your decisions are in, record them here — the good and the bad. MEPAi uses real
          results from students on MyEduPort, next to the profile each one came from, to work out
          what admission actually takes. Your name is never attached to it.
        </p>
      </header>

      {msg.text && (
        <div className="card compact" style={{ marginBottom: "1.25rem", background: msg.error ? "var(--error-soft)" : "var(--success-soft)", color: msg.error ? "var(--error-deep)" : "var(--ink)" }}>
          {msg.text}
        </div>
      )}

      {!open && (
        <button className="button" style={{ marginBottom: "1.5rem" }} onClick={() => { setForm(BLANK); setEditingId(null); setOpen(true); }}>
          + Add a result
        </button>
      )}

      {open && (
        <section className="card" style={{ marginBottom: "1.75rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
            {editingId ? "Edit result" : "Add a result"}
          </h2>
          <div className="grid two" style={{ gap: "1rem" }}>
            <label className="input">
              <span>University</span>
              <input list="mep-uni-list" value={form.university_name} onChange={set("university_name")} placeholder="Start typing a university…" />
              <datalist id="mep-uni-list">
                {unis.map((u) => <option key={u.id || u.name} value={u.name} />)}
              </datalist>
            </label>
            <label className="input">
              <span>Country</span>
              <input value={form.country} onChange={set("country")} placeholder="US, UK, Australia…" />
            </label>
            <label className="input">
              <span>Entry year</span>
              <input value={form.cycle_year} onChange={set("cycle_year")} placeholder="2027" inputMode="numeric" />
            </label>
            <label className="input">
              <span>Round</span>
              <select value={form.application_round} onChange={set("application_round")}>
                <option value="">Not sure / other</option>
                {options.rounds.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="input">
              <span>Course / major</span>
              <input value={form.major} onChange={set("major")} placeholder="Computer Engineering" />
            </label>
            <label className="input">
              <span>Result</span>
              <select value={form.result} onChange={set("result")}>
                {(options.results.length ? options.results : Object.keys(RESULT_STYLE)).map((r) => (
                  <option key={r} value={r}>{RESULT_STYLE[r]?.label || r}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="input" style={{ marginTop: "1rem" }}>
            <span>Anything worth noting <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></span>
            <textarea rows={3} value={form.notes} onChange={set("notes")} placeholder="Scholarship offered, interview round, grades required…" />
          </label>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button className="button" disabled={busy} onClick={save}>{busy ? "Saving…" : editingId ? "Save changes" : "Save result"}</button>
            <button className="button ghost" disabled={busy} onClick={cancel}>Cancel</button>
          </div>
        </section>
      )}

      {rows === null ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <p className="muted" style={{ margin: 0 }}>No results recorded yet. Add them as your decisions come in.</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: "0.85rem" }}>
          {rows.map((r) => {
            const rs = RESULT_STYLE[r.result] || { label: r.result, color: "var(--ink)", soft: "var(--surface)" };
            return (
              <article key={r.id} className="card compact" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "1rem" }}>{r.university_name}</strong>
                    <span className="badge" style={{ background: rs.soft, color: rs.color, border: `1px solid ${rs.color}` }}>{rs.label}</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0.3rem 0 0" }}>
                    {[r.major, r.application_round, r.cycle_year, r.country].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {r.notes && <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", margin: "0.45rem 0 0" }}>{r.notes}</p>}
                  <p className="text-muted" style={{ fontSize: "0.72rem", margin: "0.4rem 0 0" }}>Recorded {fmtDate(r.created_at)}</p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button className="button ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }} onClick={() => startEdit(r)}>Edit</button>
                  <button className="button ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }} onClick={() => remove(r)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
