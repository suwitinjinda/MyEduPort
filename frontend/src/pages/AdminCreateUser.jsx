import React, { useState } from "react";
import { apiFetch } from "../api/client";

// Admin → Users → "+ Create user". The admin never sets a password: the new person gets an
// invite link (emailed when Email Settings is set up, otherwise shown here to copy) and
// chooses their own. They give their own privacy consent at first sign-in.

export const ROLE_OPTIONS = [
  ["student", "Student", "Builds a portfolio. Starts with the 14-day free trial unless you pick a plan."],
  ["parent", "Parent", "Follows their child's progress once linked."],
  ["counselor", "School counsellor", "Advises the students who link to them."],
  ["consult", "Consultant", "Consultant workspace — features are being designed."],
  ["admin", "Admin", "Full access to this Admin panel. Give this only to staff you trust."]
];

export function InviteResult({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(result.invite.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select manually */ }
  };
  return (
    <div className="card" style={{ background: "var(--success-soft)", border: "1px solid var(--success)", marginBottom: "1rem" }}>
      <strong style={{ color: "var(--success-deep)" }}>
        {result.resent ? `New invite link for ${result.user?.name || "this user"}.` : `Account created for ${result.user?.name}.`}
      </strong>
      <p style={{ margin: "0.35rem 0 0.6rem", fontSize: "0.88rem", color: "var(--ink)" }}>
        {result.invite.emailed
          ? <>We emailed {result.user?.email || "them"} a link to choose their password. You can also send this link yourself:</>
          : <>Email isn't set up, so nothing was sent. Send this link to {result.user?.email || "them"} (LINE, chat…) so they can choose their password:</>}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input readOnly value={result.invite.link} onFocus={(e) => e.target.select()} aria-label="Invite link" style={{ flex: "1 1 260px", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }} />
        <button type="button" className="button" onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</button>
        <button type="button" className="button ghost" onClick={onClose}>Done</button>
      </div>
      <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.5rem 0 0" }}>The link works for {result.invite.expires_in_days} days and only once. Don't post it publicly — whoever opens it can set the password.</p>
    </div>
  );
}

// onCreated(result) — the parent shows the invite link: reloading the user list re-mounts
// this form, so it can't keep the result itself.
export default function AdminCreateUser({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", username: "", role: "student", plan: "" });
  const [local, setLocal] = useState(false); // no real email → username@local
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.role === "admin" && !window.confirm(`Give ${form.name || form.email} full admin access?`)) return;
    setBusy(true); setErr("");
    try {
      const { username, email, ...rest } = form;
      const r = await apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify(local ? { ...rest, username } : { ...rest, email }) });
      setOpen(false);
      setForm({ name: "", email: "", username: "", role: "student", plan: "" });
      onCreated?.(r);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  const roleInfo = ROLE_OPTIONS.find(([v]) => v === form.role);

  return (
    <div style={{ marginBottom: "1rem" }}>
      {!open ? (
        <button type="button" className="button gold" onClick={() => setOpen(true)}>+ Create user</button>
      ) : (
        <form onSubmit={submit} className="card" style={{ background: "var(--surface-warm)" }}>
          <div className="flex-between" style={{ gap: "0.5rem", marginBottom: "0.75rem" }}>
            <h3 className="subtitle" style={{ margin: 0 }}>Create a user</h3>
            <button type="button" className="button ghost" style={{ padding: "0.3rem 0.8rem", fontSize: "0.75rem" }} onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <div role="radiogroup" aria-label="Sign-in" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {[[false, "Real email"], [true, "No email — username only"]].map(([v, l]) => (
              <button key={l} type="button" role="radio" aria-checked={local === v} className={`cs-filter${local === v ? " on" : ""}`} onClick={() => setLocal(v)}>{l}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            <div className="input" style={{ marginBottom: 0 }}><label htmlFor="cu-name">Full name</label><input id="cu-name" value={form.name} onChange={set("name")} maxLength={120} required /></div>
            {local ? (
              <div className="input" style={{ marginBottom: 0 }}>
                <label htmlFor="cu-user">Username</label>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  <input id="cu-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })} maxLength={40} placeholder="e.g. somchai01" style={{ flex: 1, minWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} required />
                  <span style={{ display: "flex", alignItems: "center", padding: "0 0.75rem", border: "1.5px solid var(--rule)", borderLeft: "none", borderRadius: "0 var(--r-md) var(--r-md) 0", background: "var(--surface)", color: "var(--ink-soft)", fontWeight: 600 }}>@local</span>
                </div>
              </div>
            ) : (
              <div className="input" style={{ marginBottom: 0 }}><label htmlFor="cu-email">Email</label><input id="cu-email" type="email" value={form.email} onChange={set("email")} maxLength={190} required /></div>
            )}
            <div className="input" style={{ marginBottom: 0 }}>
              <label htmlFor="cu-role">Role</label>
              <select id="cu-role" value={form.role} onChange={set("role")}>{ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </div>
            {["student", "parent"].includes(form.role) && (
              <div className="input" style={{ marginBottom: 0 }}>
                <label htmlFor="cu-plan">Plan</label>
                <select id="cu-plan" value={form.plan} onChange={set("plan")}>
                  <option value="">Free + 14-day trial</option>
                  <option value="essential">Essential</option>
                  <option value="professional">Professional</option>
                  <option value="elite">Elite</option>
                </select>
              </div>
            )}
          </div>
          {roleInfo && <p className="text-muted" style={{ fontSize: "0.8rem", margin: "0.6rem 0 0", color: form.role === "admin" ? "var(--error-deep)" : undefined }}>{roleInfo[2]}</p>}
          {local && (
            <p style={{ fontSize: "0.82rem", margin: "0.5rem 0 0", color: "var(--ink)" }}>
              Signs in as <strong className="mono">{form.username || "username"}@local</strong> — not a real mailbox, so nothing is ever emailed to it. You'll get a link to pass on yourself, and if they forget their password, use “New link” in the list below.
            </p>
          )}
          <p className="text-muted" style={{ fontSize: "0.8rem", margin: "0.4rem 0 0" }}>They'll get a link to choose their own password, and confirm the privacy consent themselves when they first sign in. Students under 20 still need a parent's consent.</p>
          {err && <p style={{ color: "var(--error-deep)", fontSize: "0.85rem", margin: "0.6rem 0 0" }}>{err}</p>}
          <button className="button" style={{ marginTop: "0.9rem" }} disabled={busy || !form.name.trim() || !(local ? form.username.length >= 2 : form.email.trim())}>{busy ? "Creating…" : "Create and get invite link"}</button>
        </form>
      )}
    </div>
  );
}
