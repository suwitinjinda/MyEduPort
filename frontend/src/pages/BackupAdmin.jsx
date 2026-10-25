import React, { useEffect, useState } from "react";
import { apiFetch, getToken, API_URL } from "../api/client";
import { fmtDateTime } from "../utils/date.js";

// Admin → Backups.
//
// The point of this screen is to answer one question at a glance: is there a backup from
// last night that would actually restore? A backup system that quietly stopped looks
// exactly like one that is working, right up until the day it is needed.

const HEALTH = {
  ok: { label: "Healthy", color: "var(--success-deep)", soft: "var(--success-soft)", line: "Last backup is recent." },
  late: { label: "Late", color: "#b45309", soft: "#fef3c7", line: "No backup in over a day — check the nightly job." },
  stale: { label: "Stale", color: "var(--error-deep)", soft: "var(--error-soft)", line: "No backup for days. The nightly job is probably not running." },
  none: { label: "No backups", color: "var(--error-deep)", soft: "var(--error-soft)", line: "Nothing has been backed up yet." }
};

const mb = (b) => (b == null ? "—" : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export default function BackupAdmin() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState(null); // { ok, title, text }
  const [confirmFor, setConfirmFor] = useState(null); // backup name awaiting the typed phrase
  const [phrase, setPhrase] = useState("");

  const load = () => apiFetch("/api/admin/backup").then(setData).catch((e) => setOut({ ok: false, title: "Could not load", text: e.message }));
  useEffect(() => { load(); }, []);

  const run = async (label, fn) => {
    setBusy(label); setOut(null);
    try { setOut(await fn()); await load(); }
    catch (e) { setOut({ ok: false, title: "Failed", text: e.message }); }
    finally { setBusy(""); }
  };

  const backupNow = () => run("run", async () => {
    const r = await apiFetch("/api/admin/backup/run", { method: "POST", body: JSON.stringify({ verify: true }) });
    return { ok: true, title: "Backup complete", text: r.output };
  });

  const drill = (name) => run("drill:" + name, async () => {
    const r = await apiFetch("/api/admin/backup/drill", { method: "POST", body: JSON.stringify({ name }) });
    return { ok: true, title: "Restore rehearsal passed", text: r.output };
  });

  const inspect = (name) => run("inspect:" + name, async () => {
    const r = await apiFetch(`/api/admin/backup/inspect?name=${encodeURIComponent(name)}`);
    return {
      ok: r.readable && r.ends_cleanly,
      title: r.ends_cleanly ? "File is complete and readable" : "File looks truncated",
      text: `Taken ${r.taken}\n${r.create_statements} CREATE TABLE, ${r.insert_statements} INSERT statements\n${mb(r.uncompressed_bytes)} uncompressed\nEnds cleanly: ${r.ends_cleanly ? "yes" : "NO — do not rely on this one"}`
    };
  });

  const download = (name) => {
    // Streamed, and the auth header has to ride along, so fetch then save
    setBusy("dl:" + name);
    fetch(`${API_URL}/api/admin/backup/download?name=${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Download failed (${r.status})`); return r.blob(); })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        setOut({ ok: true, title: "Downloaded", text: `${name} — keep it somewhere other than this server.` });
      })
      .catch((e) => setOut({ ok: false, title: "Download failed", text: e.message }))
      .finally(() => setBusy(""));
  };

  const restoreLive = (name) => run("restore:" + name, async () => {
    const r = await apiFetch("/api/admin/backup/restore-live", {
      method: "POST", body: JSON.stringify({ name, confirm: phrase })
    });
    setConfirmFor(null); setPhrase("");
    return { ok: true, title: "Live database restored", text: `${r.output}\n\n${r.next}` };
  });

  if (!data) return <p className="muted">Loading backups…</p>;
  const h = HEALTH[data.health] || HEALTH.none;

  return (
    <div>
      {/* Health banner — the thing worth seeing without reading anything else */}
      <section className="card" style={{ marginBottom: "1.25rem", borderLeft: `4px solid ${h.color}`, background: h.soft }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: h.color }}>{h.label}</div>
            <p style={{ margin: "0.3rem 0 0", color: "var(--ink)", fontSize: "0.9rem" }}>
              {h.line}{data.newest_at && ` Last backup ${fmtDateTime(data.newest_at)} (${data.hours_since}h ago).`}
            </p>
            <p className="text-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
              {data.count} backup{data.count === 1 ? "" : "s"} · {mb(data.total_bytes)} on disk · {data.free_mb != null ? `${(data.free_mb / 1024).toFixed(0)} GB free` : "free space unknown"}
              {data.recent_failures > 0 && ` · ${data.recent_failures} failure(s) in the recent log`}
            </p>
          </div>
          <button className="button" disabled={!!busy} onClick={backupNow}>
            {busy === "run" ? "Backing up…" : "↻ Back up now"}
          </button>
        </div>
      </section>

      {out && (
        <section className="card compact" style={{ marginBottom: "1.25rem", background: out.ok ? "var(--success-soft)" : "var(--error-soft)" }}>
          <strong style={{ color: out.ok ? "var(--success-deep)" : "var(--error-deep)" }}>{out.title}</strong>
          <pre style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap", fontSize: "0.78rem", fontFamily: "ui-monospace, monospace", color: "var(--ink-soft)" }}>{out.text}</pre>
        </section>
      )}

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 className="section-title" style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>Backups on this server</h3>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "1rem" }}>
          {data.dir} · kept 14 days daily, then weekly for 12 weeks
        </p>

        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
                <th style={{ textAlign: "left", padding: "0.5rem 0.5rem 0.5rem 0" }}>Taken</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Contents</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Size</th>
                <th style={{ textAlign: "right", padding: "0.5rem 0 0.5rem 0.5rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.backups.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "1.5rem 0", textAlign: "center" }} className="muted">No backups yet. Press “Back up now”.</td></tr>
              )}
              {data.backups.map((b) => (
                <tr key={b.name} style={{ borderTop: "1px solid var(--rule-soft)" }}>
                  <td style={{ padding: "0.7rem 0.5rem 0.7rem 0", fontWeight: 600, fontSize: "0.88rem" }}>
                    {fmtDateTime(b.taken_at)}
                    {b.verified && <span className="badge" style={{ marginLeft: "0.5rem", background: "var(--success-soft)", color: "var(--success-deep)" }}>verified</span>}
                  </td>
                  <td style={{ padding: "0.7rem 0.5rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                    {b.tables != null ? `${b.tables} tables · ${b.rows} rows` : "database"}
                    {b.uploads_name ? " · uploaded files" : <span style={{ color: "var(--error-deep)" }}> · no file archive</span>}
                  </td>
                  <td style={{ padding: "0.7rem 0.5rem", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                    {mb(b.db_bytes)}{b.uploads_bytes ? ` + ${mb(b.uploads_bytes)}` : ""}
                  </td>
                  <td style={{ padding: "0.7rem 0 0.7rem 0.5rem", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="button ghost" style={act} disabled={!!busy} onClick={() => inspect(b.name)}>
                      {busy === "inspect:" + b.name ? "…" : "Check"}
                    </button>
                    <button className="button ghost" style={act} disabled={!!busy} onClick={() => drill(b.name)}>
                      {busy === "drill:" + b.name ? "…" : "Test restore"}
                    </button>
                    <button className="button ghost" style={act} disabled={!!busy} onClick={() => download(b.name)}>
                      {busy === "dl:" + b.name ? "…" : "Download"}
                    </button>
                    <button className="button ghost" style={{ ...act, color: "var(--error-deep)", borderColor: "var(--error-deep)" }}
                      disabled={!!busy} onClick={() => { setConfirmFor(b.name); setPhrase(""); setOut(null); }}>
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {confirmFor && (
        <section className="card" style={{ marginBottom: "1.25rem", border: "2px solid var(--error-deep)" }}>
          <h3 className="section-title" style={{ fontSize: "1.05rem", color: "var(--error-deep)", marginBottom: "0.5rem" }}>
            Restore the live database
          </h3>
          <p style={{ fontSize: "0.9rem", margin: "0 0 0.5rem" }}>
            From <strong>{confirmFor}</strong>.
          </p>
          <ul className="list" style={{ fontSize: "0.86rem", color: "var(--ink-soft)", marginBottom: "0.85rem" }}>
            <li>Every table is replaced, for <strong>every user</strong> — not just one account.</li>
            <li>Anything saved since that backup was taken is lost.</li>
            <li>A safety backup of the current database is taken first, automatically.</li>
            <li>Uploaded files are a separate archive and are <strong>not</strong> restored here.</li>
            <li>Restart the API afterwards: <code>pm2 restart myeduport-backend</code></li>
          </ul>
          <label className="input" style={{ maxWidth: "26rem" }}>
            <span>Type <code>RESTORE LIVE DATABASE</code> to confirm</span>
            <input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="RESTORE LIVE DATABASE" autoComplete="off" />
          </label>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
            <button className="button" style={{ background: "var(--error-deep)" }}
              disabled={!!busy || phrase !== "RESTORE LIVE DATABASE"}
              onClick={() => restoreLive(confirmFor)}>
              {busy.startsWith("restore:") ? "Restoring…" : "Restore now"}
            </button>
            <button className="button ghost" disabled={!!busy} onClick={() => { setConfirmFor(null); setPhrase(""); }}>Cancel</button>
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="section-title" style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Recent log</h3>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.74rem", fontFamily: "ui-monospace, monospace", color: "var(--ink-soft)", maxHeight: "16rem", overflowY: "auto" }}>
          {(data.log_tail || []).join("\n") || "Nothing logged yet."}
        </pre>
      </section>
    </div>
  );
}

const act = { padding: "0.25rem 0.6rem", fontSize: "0.72rem", marginLeft: "0.3rem" };
