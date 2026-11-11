import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fmtDate, fmtDateTime } from "../utils/date.js";
import { refreshLegalInfo } from "../utils/legalInfo.js";

// Admin → Consents: how long we wait for a parent, how long closed accounts are kept,
// and every parent-consent request with where it stands.

const STATUS_STYLE = {
  pending: { bg: "#fef3c7", fg: "#92400e", label: "Waiting" },
  confirmed: { bg: "var(--success-soft)", fg: "var(--success-deep)", label: "Confirmed" },
  declined: { bg: "var(--error-soft)", fg: "var(--error-deep)", label: "Declined" },
  expired: { bg: "#e5e7eb", fg: "#374151", label: "Expired" },
  replaced: { bg: "#e5e7eb", fg: "#374151", label: "Replaced" }
};

export default function ConsentsAdmin() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ parent_days: 14, closed_account_days: 30 });
  const [legal, setLegal] = useState({ entity_name: "", countries: "", dpo_email: "", backup_days: "" });
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", error: false });

  const load = () => apiFetch("/api/admin/consents").then((d) => {
    setData(d); setForm(d.settings);
    if (d.legal) setLegal({ entity_name: d.legal.entity_name || "", countries: d.legal.countries || "", dpo_email: d.legal.dpo_email || "", backup_days: d.legal.backup_days ?? "" });
  }).catch((e) => setMsg({ text: e.message, error: true }));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy("save"); setMsg({ text: "", error: false });
    try { await apiFetch("/api/admin/consents/settings", { method: "PUT", body: JSON.stringify(form) }); await load(); setMsg({ text: "Saved.", error: false }); }
    catch (e) { setMsg({ text: e.message, error: true }); } finally { setBusy(""); }
  };
  const saveLegal = async () => {
    setBusy("legal"); setMsg({ text: "", error: false });
    try { await apiFetch("/api/admin/consents/legal", { method: "PUT", body: JSON.stringify(legal) }); await load(); refreshLegalInfo(); setMsg({ text: "Company details saved — they now show on the consent forms and legal pages.", error: false }); }
    catch (e) { setMsg({ text: e.message, error: true }); } finally { setBusy(""); }
  };
  const run = async () => {
    setBusy("run"); setMsg({ text: "", error: false });
    try {
      const r = await apiFetch("/api/admin/consents/run", { method: "POST" });
      await load();
      setMsg({ text: `Done — ${r.reminded} reminder(s) sent, ${r.deleted} unconfirmed sign-up(s) deleted, ${r.restricted} account(s) restricted, ${r.purged} closed account(s) purged.`, error: false });
    } catch (e) { setMsg({ text: e.message, error: true }); } finally { setBusy(""); }
  };

  if (!data) return <p className="muted">{msg.text || "Loading…"}</p>;
  const rows = data.requests.filter((r) => filter === "all" || r.status === filter);
  const num = (k) => (e) => setForm({ ...form, [k]: e.target.value.replace(/\D/g, "") });

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" }}>
        {[
          ["Waiting for a parent", data.counts?.pending || 0],
          ["Parent confirmed", data.counts?.confirmed || 0],
          ["Closed accounts", data.counts?.closed || 0],
          ["Consent version", data.version]
        ].map(([l, v]) => (
          <div key={l} className="card compact"><div className="text-muted" style={{ fontSize: "0.78rem" }}>{l}</div><div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink)" }}>{v}</div></div>
        ))}
      </div>

      {!data.email_enabled && (
        <div className="card compact" style={{ background: "#fef3c7", color: "#92400e" }}>
          Email isn't set up yet, so parents aren't emailed — students share their link on LINE or by copy-paste instead. Fill in <strong>Email Settings</strong> to turn emails on.
        </div>
      )}

      <section className="card">
        <h2 className="section-title" style={{ fontSize: "1.15rem" }}>Company details</h2>
        <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>Shown in the privacy summary on sign-up, the parent consent page, and the Terms of Service. Anything left empty shows as a yellow <mark style={{ background: "#fef3c7", color: "#92400e" }}>[placeholder]</mark> on the site.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.9rem" }}>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="ca-entity">Legal entity name</label>
            <input id="ca-entity" value={legal.entity_name} onChange={(e) => setLegal({ ...legal, entity_name: e.target.value })} placeholder="e.g. MyEduPort Co., Ltd." />
          </div>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="ca-dpo">Data Protection Officer (DPO) email</label>
            <input id="ca-dpo" type="email" value={legal.dpo_email} onChange={(e) => setLegal({ ...legal, dpo_email: e.target.value })} placeholder="dpo@myeduport.ai" />
          </div>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="ca-countries">Countries where data is stored / processed</label>
            <input id="ca-countries" value={legal.countries} onChange={(e) => setLegal({ ...legal, countries: e.target.value })} placeholder="e.g. Singapore, United States" />
          </div>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="ca-backup">Remove from backups within (days)</label>
            <input id="ca-backup" inputMode="numeric" value={legal.backup_days} onChange={(e) => setLegal({ ...legal, backup_days: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 90" />
            <small className="text-muted">Deleting a closed account uses “Keep closed accounts for” above ({form.closed_account_days} days).</small>
          </div>
        </div>
        <button className="button" style={{ marginTop: "1rem" }} disabled={!!busy} onClick={saveLegal}>{busy === "legal" ? "Saving…" : "Save company details"}</button>
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: "1.15rem" }}>Rules</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.9rem" }}>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="ca-days">Days to wait for a parent (1–90)</label>
            <input id="ca-days" inputMode="numeric" value={form.parent_days} onChange={num("parent_days")} />
            <small className="text-muted">After this, a new under-20 sign-up is deleted. Accounts that existed before are only restricted.</small>
          </div>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="ca-closed">Keep closed accounts for (days, 0–365)</label>
            <input id="ca-closed" inputMode="numeric" value={form.closed_account_days} onChange={num("closed_account_days")} />
            <small className="text-muted">Then the account and its files are deleted for good.</small>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button className="button" disabled={!!busy} onClick={save}>{busy === "save" ? "Saving…" : "Save"}</button>
          <button className="button ghost" disabled={!!busy} onClick={run}>{busy === "run" ? "Running…" : "Run reminders & clean-up now"}</button>
        </div>
        <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.6rem 0 0" }}>This also runs by itself every hour. Reminders go out on day 3 and 4 days before the deadline.</p>
        {msg.text && <p style={{ fontSize: "0.85rem", margin: "0.5rem 0 0", color: msg.error ? "var(--error-deep)" : "var(--success-deep)" }}>{msg.text}</p>}
      </section>

      <section className="card">
        <div className="flex-between" style={{ gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.15rem", margin: 0 }}>Parent consent requests</h2>
          <div role="group" aria-label="Filter by status" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {["pending", "confirmed", "declined", "expired", "all"].map((f) => (
              <button key={f} type="button" className={`button${filter === f ? "" : " ghost"}`} aria-pressed={filter === f} style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : STATUS_STYLE[f].label}
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? <p className="muted" style={{ margin: 0 }}>No requests here.</p> : (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Parent consent requests">
            <table>
              <thead><tr><th>Student</th><th>Parent email</th><th>Status</th><th>Sent</th><th>Deadline</th><th>Reminders</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE.expired;
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.student_name}</strong><div className="text-muted" style={{ fontSize: "0.75rem" }}>{r.student_email}{r.is_existing ? " · existing account" : ""}</div></td>
                      <td>{r.parent_email}</td>
                      <td><span className="badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>{r.decided_at && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{fmtDate(r.decided_at)}</div>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{r.last_sent_at ? fmtDateTime(r.last_sent_at) : <span className="text-muted">Not emailed</span>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.expires_at)}</td>
                      <td>{r.reminders_sent}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
