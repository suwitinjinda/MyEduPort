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

  const load = async () => {
    try {
      const [list, unis] = await Promise.all([
        apiFetch("/api/students/me/saved-universities").catch(() => []),
        apiFetch("/api/universities").catch(() => [])
      ]);
      setSaved(list || []);
      setAllUnis(unis || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        <div style={{ overflowX: "auto" }}>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...buckets.reach, ...buckets.target, ...buckets.safety].map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{s.name}</strong>
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
        <div className="advisory-label">Strategy reminder</div>
        <p className="muted" style={{ fontSize: "0.92rem", marginTop: "0.4rem" }}>
          The Excellent Portfolio Guide recommends a balanced list: roughly 30% reach, 50% target, 20% safety.
          Apply only to schools you'd actually attend.
        </p>
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
