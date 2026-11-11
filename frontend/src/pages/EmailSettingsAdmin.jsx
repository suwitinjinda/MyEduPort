import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fmtDateTime } from "../utils/date.js";

// Admin → Email Settings: the SMTP account every MyEduPort email goes out through —
// parent consent requests, password resets, reminders and marketing campaigns.
// The password is stored encrypted and never sent back to the browser.

const PRESETS = [
  { key: "", label: "Choose a provider (optional)…" },
  { key: "gmail", label: "Google Workspace / Gmail", host: "smtp.gmail.com", port: 587, hint: "Use an App Password (Google Account → Security → App passwords), not your normal password." },
  { key: "ses", label: "Amazon SES (Singapore)", host: "email-smtp.ap-southeast-1.amazonaws.com", port: 587, hint: "Use the SMTP credentials created in the SES console, and verify your domain there first." },
  { key: "resend", label: "Resend", host: "smtp.resend.com", port: 465, user: "resend", hint: "Username is “resend”; the password is your Resend API key." },
  { key: "brevo", label: "Brevo", host: "smtp-relay.brevo.com", port: 587, hint: "Use the SMTP login and key from Brevo → SMTP & API." },
  { key: "sendgrid", label: "SendGrid", host: "smtp.sendgrid.net", port: 587, user: "apikey", hint: "Username is “apikey”; the password is your SendGrid API key." },
  { key: "outlook", label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, hint: "SMTP AUTH must be enabled for the mailbox in Microsoft 365 admin." }
];

const BLANK = { host: "", port: 587, user: "", pass: "", from: "", reply_to: "" };

export default function EmailSettingsAdmin() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [preset, setPreset] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", error: false });

  const load = () => apiFetch("/api/admin/email/settings").then((s) => {
    setSaved(s);
    setForm({ host: s.host || "", port: s.port || 587, user: s.user || "", pass: "", from: s.from || "", reply_to: s.reply_to || "" });
  }).catch((e) => setMsg({ text: e.message, error: true }));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: k === "port" ? e.target.value.replace(/\D/g, "") : e.target.value });
  const choosePreset = (e) => {
    const p = PRESETS.find((x) => x.key === e.target.value);
    setPreset(e.target.value);
    if (p?.host) setForm((f) => ({ ...f, host: p.host, port: p.port, user: p.user ?? f.user }));
  };
  const hint = PRESETS.find((x) => x.key === preset)?.hint;

  const act = async (label, fn) => {
    setBusy(label); setMsg({ text: "", error: false });
    try { await fn(); } catch (e) { setMsg({ text: e.message, error: true }); } finally { setBusy(""); }
  };
  const save = () => act("save", async () => {
    const s = await apiFetch("/api/admin/email/settings", { method: "PUT", body: JSON.stringify({ ...form, port: Number(form.port) }) });
    setSaved(s); setForm((f) => ({ ...f, pass: "" }));
    setMsg({ text: "Saved. Every email from MyEduPort now goes out through this account.", error: false });
  });
  const test = (sendTo) => act(sendTo ? "send" : "check", async () => {
    await apiFetch("/api/admin/email/settings/test", { method: "POST", body: JSON.stringify({ settings: { ...form, port: Number(form.port) }, send_to: sendTo || "" }) });
    setMsg({ text: sendTo ? `Test email sent to ${sendTo}. Check the inbox (and spam folder).` : "Connected to the email server — the settings work.", error: false });
  });
  const clear = () => {
    if (!window.confirm("Remove the saved email settings? Emails will stop sending unless backend/.env has SMTP settings.")) return;
    act("clear", async () => { const s = await apiFetch("/api/admin/email/settings", { method: "DELETE" }); setSaved(s); setForm(BLANK); setMsg({ text: "Email settings removed.", error: false }); });
  };

  if (!saved) return <p className="muted">{msg.text || "Loading…"}</p>;
  const statusStyle = saved.configured
    ? { background: "var(--success-soft)", color: "var(--success-deep)", border: "1px solid var(--success-deep)" }
    : { background: "#fef3c7", color: "#92400e", border: "1px solid #b45309" };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card compact" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <span className="badge" style={statusStyle}>{saved.configured ? "Email is working" : "Email not set up"}</span>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {saved.configured
            ? <>Sending as <strong>{saved.from}</strong>{saved.source === "env" ? " (from backend/.env)" : saved.updated_at ? ` · saved ${fmtDateTime(saved.updated_at)}` : ""}</>
            : "Parent consent emails, password resets, reminders and campaigns can't be sent until this is filled in."}
        </span>
      </div>

      {msg.text && (
        <div className="card compact" style={{ marginBottom: "1rem", background: msg.error ? "var(--error-soft)" : "var(--success-soft)", color: msg.error ? "var(--error-deep)" : "var(--ink)" }}>{msg.text}</div>
      )}

      <section className="card" style={{ padding: "1.5rem" }}>
        <h3 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>SMTP account</h3>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>Any email provider works. Pick one to fill in the server for you.</p>

        <div className="input">
          <label htmlFor="smtp-preset">Provider</label>
          <select id="smtp-preset" value={preset} onChange={choosePreset}>
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          {hint && <small className="text-muted" style={{ display: "block", marginTop: "0.3rem" }}>{hint}</small>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)", gap: "0.75rem" }}>
          <div className="input"><label htmlFor="smtp-host">SMTP server</label><input id="smtp-host" value={form.host} onChange={set("host")} placeholder="smtp.example.com" autoComplete="off" /></div>
          <div className="input"><label htmlFor="smtp-port">Port</label><input id="smtp-port" value={form.port} onChange={set("port")} inputMode="numeric" placeholder="587" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
          <div className="input"><label htmlFor="smtp-user">Username</label><input id="smtp-user" value={form.user} onChange={set("user")} autoComplete="off" /></div>
          <div className="input">
            <label htmlFor="smtp-pass">Password</label>
            <input id="smtp-pass" type="password" value={form.pass} onChange={set("pass")} autoComplete="new-password" placeholder={saved.has_password ? "•••••••• (saved — leave blank to keep)" : ""} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
          <div className="input"><label htmlFor="smtp-from">From</label><input id="smtp-from" value={form.from} onChange={set("from")} placeholder="MyEduPort <hello@myeduport.ai>" /></div>
          <div className="input"><label htmlFor="smtp-reply">Reply-to <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label><input id="smtp-reply" value={form.reply_to} onChange={set("reply_to")} placeholder="support@myeduport.ai" /></div>
        </div>
        <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0 0 1rem" }}>Port 587 uses STARTTLS; port 465 uses SSL. The password is stored encrypted and is never shown again.</p>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="button" disabled={!!busy} onClick={save}>{busy === "save" ? "Saving…" : "Save settings"}</button>
          <button type="button" className="button ghost" disabled={!!busy} onClick={() => test("")}>{busy === "check" ? "Checking…" : "Check connection"}</button>
          {saved.source === "admin" && <button type="button" className="button ghost" style={{ color: "var(--error-deep)" }} disabled={!!busy} onClick={clear}>Remove</button>}
        </div>
      </section>

      <section className="card" style={{ padding: "1.5rem", marginTop: "1.25rem" }}>
        <h3 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>Send a test email</h3>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>Uses the values above, even before you save.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input aria-label="Send the test to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" style={{ flex: "1 1 240px" }} />
          <button type="button" className="button" disabled={!!busy || !testTo.trim()} onClick={() => test(testTo.trim())}>{busy === "send" ? "Sending…" : "Send test"}</button>
        </div>
      </section>
    </div>
  );
}
