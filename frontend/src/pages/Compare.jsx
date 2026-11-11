import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { EmptyState } from "../components/Skeleton.jsx";
import Skeleton from "../components/Skeleton.jsx";

const ROUNDS = [
  { value: "", label: "—" },
  { value: "ED", label: "Early Decision" },
  { value: "EA", label: "Early Action" },
  { value: "REA", label: "Restrictive EA" },
  { value: "RD", label: "Regular Decision" },
  { value: "Rolling", label: "Rolling" }
];

const FLAG = { US: "🇺🇸", UK: "🇬🇧", China: "🇨🇳" };

export default function Compare() {
  const [saved, setSaved] = useState([]);
  const [allUnis, setAllUnis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState({ id: "", bucket: "target", application_round: "", deadline: "" });
  const [status, setStatus] = useState("");
  const [outcomes, setOutcomes] = useState({}); // { [university_id]: result } — application results the student reported
  const [intended, setIntended] = useState({ added: [], not_found: [] }); // from Portfolio → Personal

  const load = async ({ sync = false } = {}) => {
    try {
      // First visit of the page: bring in the Intended Universities picked in Portfolio → Personal
      if (sync) {
        const r = await apiFetch("/api/students/me/saved-universities/sync-intended", { method: "POST" }).catch(() => null);
        if (r) setIntended({ added: r.added || [], not_found: r.not_found || [] });
      }
      const [list, unis] = await Promise.all([
        apiFetch("/api/students/me/saved-universities").catch(() => []),
        apiFetch("/api/universities").catch(() => [])
      ]);
      setSaved(list || []);
      setAllUnis(unis || []);
      const oc = await apiFetch("/api/students/me/outcomes").catch(() => []);
      setOutcomes(Object.fromEntries((oc || []).map((o) => [o.university_id, o.result])));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load({ sync: true }); }, []);

  // Record the decision a university sent (helps MEPAi advise future students — saved with a profile snapshot)
  const setOutcome = async (row, result) => {
    setOutcomes((o) => ({ ...o, [row.university_id]: result }));
    try {
      await apiFetch("/api/students/me/outcomes", { method: "PUT", body: JSON.stringify({ university_id: row.university_id, result, application_round: row.application_round || "" }) });
      setStatus(result ? "Result saved — thank you, it helps MEPAi advise future students." : "Result cleared.");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) { setStatus(err.message); }
  };

  const addUni = async (e) => {
    e.preventDefault();
    if (!selectedToAdd.id) return;
    try {
      await apiFetch("/api/students/me/saved-universities", {
        method: "POST",
        body: JSON.stringify({
          university_id: Number(selectedToAdd.id),
          bucket: selectedToAdd.bucket,
          application_round: selectedToAdd.application_round,
          deadline: selectedToAdd.deadline || null
        })
      });
      setSelectedToAdd({ id: "", bucket: "target", application_round: "", deadline: "" });
      setAddOpen(false);
      load();
    } catch (err) {
      setStatus(err.message);
    }
  };

  const updateRow = async (row, patch) => {
    await apiFetch(`/api/students/me/saved-universities/${row.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...row, ...patch })
    });
    load();
  };

  const removeRow = async (id) => {
    if (!window.confirm("Remove from your list?")) return;
    await apiFetch(`/api/students/me/saved-universities/${id}`, { method: "DELETE" });
    load();
  };

  const buckets = {
    reach: saved.filter((s) => s.bucket === "reach"),
    target: saved.filter((s) => s.bucket === "target"),
    safety: saved.filter((s) => s.bucket === "safety")
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Compare · Your College List</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Your 8–12 schools, side by side.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "62ch" }}>
          Build a balanced list — Reach, Target, Safety. Track application
          round and deadline for each, so nothing slips.
        </p>
        <ul className="muted" style={{ fontSize: "0.88rem", lineHeight: 1.6, margin: "0.85rem 0 0", paddingLeft: "1.1rem", maxWidth: "75ch" }}>
          <li>Your <strong>Intended Universities</strong> from Portfolio → Personal are added here automatically, sorted by how your GPA compares with each school.</li>
          <li><strong>Bucket</strong> — Reach is a stretch, Target fits your profile, Safety is very likely. Change it any time.</li>
          <li><strong>Round &amp; deadline</strong> — pick Early Decision, Early Action, Regular or Rolling and set the date; <strong>Days</strong> counts down for you.</li>
          <li><strong>Result</strong> — when decisions arrive, record them here. They're kept with your Admission Results and help MEPAi advise future students.</li>
        </ul>
        {(intended.added.length > 0 || intended.not_found.length > 0) && (
          <div className="card compact" style={{ marginTop: "1rem", background: "var(--success-soft)", fontSize: "0.86rem" }}>
            {intended.added.length > 0 && <div>Added from your Intended Universities: <strong>{intended.added.join(", ")}</strong>.</div>}
            {intended.not_found.length > 0 && (
              <div style={{ marginTop: intended.added.length ? "0.3rem" : 0, color: "var(--ink-soft)" }}>
                Not in our university list yet, so not added: {intended.not_found.join(", ")}.
              </div>
            )}
          </div>
        )}
      </header>

      {/* Add row */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 className="section-title" style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>
              {saved.length} {saved.length === 1 ? "school saved" : "schools saved"}
            </h2>
            <p className="muted" style={{ fontSize: "0.88rem" }}>
              {buckets.reach.length} reach · {buckets.target.length} target · {buckets.safety.length} safety
            </p>
          </div>
          <button className="button gold" onClick={() => setAddOpen(!addOpen)}>
            {addOpen ? "Cancel" : "+ Add a school"}
          </button>
        </div>

        {addOpen && (
          <form onSubmit={addUni} style={{ marginTop: "1.5rem", padding: "1.25rem", background: "var(--surface-warm)" }}>
            <div className="grid two">
              <div className="input">
                <label>University</label>
                <select value={selectedToAdd.id} onChange={(e) => setSelectedToAdd({ ...selectedToAdd, id: e.target.value })} required>
                  <option value="">Select a university…</option>
                  {allUnis
                    .filter((u) => !saved.find((s) => s.university_id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.country})</option>
                    ))}
                </select>
              </div>
              <div className="input">
                <label>Bucket</label>
                <select value={selectedToAdd.bucket} onChange={(e) => setSelectedToAdd({ ...selectedToAdd, bucket: e.target.value })}>
                  <option value="reach">Reach</option>
                  <option value="target">Target</option>
                  <option value="safety">Safety</option>
                </select>
              </div>
              <div className="input">
                <label>Application round</label>
                <select value={selectedToAdd.application_round} onChange={(e) => setSelectedToAdd({ ...selectedToAdd, application_round: e.target.value })}>
                  {ROUNDS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="input">
                <label>Deadline</label>
                <input type="date" value={selectedToAdd.deadline} onChange={(e) => setSelectedToAdd({ ...selectedToAdd, deadline: e.target.value })} />
              </div>
            </div>
            <button className="button" type="submit">Add to my list</button>
            {status && <p className="muted" style={{ marginTop: "0.5rem", color: "var(--error)" }}>{status}</p>}
          </form>
        )}
      </div>

      {/* Comparison table */}
      {loading ? (
        <Skeleton lines={6} />
      ) : saved.length === 0 ? (
        <EmptyState
          title="Your college list is empty."
          hint="Add 8–12 schools across Reach / Target / Safety. The Excellent Portfolio Guide recommends a balanced list."
          action={<Link to="/recommendations" className="button">Browse recommended universities →</Link>}
        />
      ) : (
        <div className="table-scroll" style={{ overflowX: "auto" }} tabIndex={0} role="region" aria-label="Your college list (scrolls sideways)">
          <table style={{ minWidth: "900px" }}>
            <thead>
              <tr>
                <th>University</th>
                <th>Country</th>
                <th>Bucket</th>
                <th>Selectivity</th>
                <th>Round</th>
                <th>Deadline</th>
                <th>Days</th>
                <th>Result</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...buckets.reach, ...buckets.target, ...buckets.safety].map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{s.name}</strong>
                    {s.source === "intended" && <span className="badge" style={{ marginLeft: "0.4rem", fontSize: "0.62rem" }} title="From your Intended Universities in Portfolio → Personal">Intended</span>}
                    {s.city && <p className="text-muted" style={{ marginTop: "0.15rem" }}>{s.city}</p>}
                  </td>
                  <td>{FLAG[s.country] || "🏛"} {s.country}</td>
                  <td>
                    <select
                      value={s.bucket}
                      onChange={(e) => updateRow(s, { bucket: e.target.value })}
                      style={{
                        padding: "0.3rem 0.6rem",
                        border: "1px solid var(--rule)",
                        background: bucketBg(s.bucket),
                        color: "var(--ink)",
                        fontFamily: "inherit",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        cursor: "pointer"
                      }}
                    >
                      <option value="reach">Reach</option>
                      <option value="target">Target</option>
                      <option value="safety">Safety</option>
                    </select>
                  </td>
                  <td>
                    {s.selectivity_band ? <span className="badge">{s.selectivity_band}</span> : "—"}
                  </td>
                  <td>
                    <select
                      value={s.application_round || ""}
                      onChange={(e) => updateRow(s, { application_round: e.target.value })}
                      style={{ padding: "0.3rem 0.6rem", border: "1px solid var(--rule)", background: "var(--surface)", fontFamily: "inherit", fontSize: "0.8rem" }}
                    >
                      {ROUNDS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={s.deadline ? new Date(s.deadline).toISOString().split("T")[0] : ""}
                      onChange={(e) => updateRow(s, { deadline: e.target.value })}
                      style={{ padding: "0.3rem 0.5rem", border: "1px solid var(--rule)", background: "var(--surface)", fontFamily: "inherit", fontSize: "0.8rem" }}
                    />
                  </td>
                  <td>
                    {s.deadline ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: daysUntil(s.deadline) < 0 ? "var(--error)" : daysUntil(s.deadline) < 14 ? "var(--warn)" : "var(--ink)" }}>
                        {daysUntil(s.deadline) >= 0 ? `${daysUntil(s.deadline)}d` : `${Math.abs(daysUntil(s.deadline))}d ago`}
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    <select
                      value={outcomes[s.university_id] || ""}
                      onChange={(e) => setOutcome(s, e.target.value)}
                      title="The decision you received from this university"
                      style={{ padding: "0.3rem 0.5rem", border: "1px solid var(--rule)", fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 600,
                        background: { admitted: "var(--success-soft)", enrolled: "var(--success-soft)", waitlisted: "var(--warn-soft)", deferred: "var(--warn-soft)", rejected: "var(--error-soft)" }[outcomes[s.university_id]] || "var(--surface)" }}
                    >
                      <option value="">Not yet</option>
                      <option value="admitted">Admitted</option>
                      <option value="waitlisted">Waitlisted</option>
                      <option value="deferred">Deferred</option>
                      <option value="rejected">Rejected</option>
                      <option value="enrolled">Enrolled</option>
                    </select>
                  </td>
                  <td>
                    <button className="button ghost" style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", color: "var(--error)", borderColor: "var(--error)" }} onClick={() => removeRow(s.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "2rem", padding: "1.5rem", background: "var(--surface-warm)", borderLeft: "2px solid var(--gold)" }}>
        <div className="advisory-label">MEPAi Strategy</div>
        <p className="muted" style={{ fontSize: "0.92rem", marginTop: "0.4rem" }}>
          Aim for a balanced list of 8–12 schools: roughly 30% reach, 50% target, 20% safety.
          Apply only to schools you'd actually attend.
        </p>
        <StrategyCheck counts={{ reach: buckets.reach.length, target: buckets.target.length, safety: buckets.safety.length }} />
        <Link to="/guide#interest" style={{ color: "var(--gold-deep)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "0.6rem", display: "inline-block" }}>
          Demonstrated interest guide →
        </Link>
      </div>
    </div>
  );
}

function bucketBg(bucket) {
  if (bucket === "reach") return "rgba(139, 47, 47, 0.08)";
  if (bucket === "safety") return "rgba(45, 106, 79, 0.1)";
  return "var(--gold-soft)";
}

function daysUntil(date) {
  const target = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

// Compares the student's list with the 30 / 50 / 20 balance and says what to add next.
function StrategyCheck({ counts }) {
  const total = counts.reach + counts.target + counts.safety;
  if (!total) return null;
  const goal = Math.max(8, total);
  const want = { reach: Math.round(goal * 0.3), target: Math.round(goal * 0.5), safety: Math.max(2, Math.round(goal * 0.2)) };
  const gaps = ["reach", "target", "safety"].filter((k) => counts[k] < want[k]).map((k) => `${want[k] - counts[k]} more ${k}`);
  const pct = (n) => Math.round((n / total) * 100);
  return (
    <p style={{ fontSize: "0.88rem", margin: "0.6rem 0 0", color: "var(--ink)" }}>
      Your list now: <strong>{counts.reach} reach ({pct(counts.reach)}%) · {counts.target} target ({pct(counts.target)}%) · {counts.safety} safety ({pct(counts.safety)}%)</strong>.{" "}
      {gaps.length ? <>To balance it, add {gaps.join(", ")}.</> : <>That's a well-balanced list.</>}
    </p>
  );
}
