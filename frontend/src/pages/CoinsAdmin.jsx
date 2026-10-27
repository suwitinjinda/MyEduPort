import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fmtDateTime } from "../utils/date.js";

// Admin → Coins: the student referral discount, how many coins each activity earns, and a
// way to look up a student's coins and correct them. Every manual change needs a reason.

export default function CoinsAdmin() {
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState({ text: "", error: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/referrals/coins/settings").then(setSettings).catch((e) => setMsg({ text: e.message, error: true }));
  }, []);

  const save = async () => {
    setSaving(true); setMsg({ text: "", error: false });
    try { setSettings(await apiFetch("/api/admin/referrals/coins/settings", { method: "PUT", body: JSON.stringify(settings) })); setMsg({ text: "Saved.", error: false }); }
    catch (e) { setMsg({ text: e.message, error: true }); }
    finally { setSaving(false); }
  };

  if (!settings) return <p className="muted">{msg.text || "Loading…"}</p>;
  const r = settings.referral;
  const setRef = (k) => (e) => setSettings({ ...settings, referral: { ...r, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value } });
  const setRule = (key, k) => (e) => setSettings({ ...settings, rules: { ...settings.rules, [key]: { ...settings.rules[key], [k]: e.target.value === "" && k === "limit" ? null : e.target.value } } });

  return (
    <div>
      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>Student invites</h3>
        <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>
          Each student gets a personal invite link on their Rewards page. Applies to friends who sign up from now on.
        </p>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.9rem", marginBottom: "1rem" }}>
          <input type="checkbox" checked={!!r.enabled} onChange={setRef("enabled")} /> Invites are on
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <label className="input"><span>Friend's discount (%)</span><input value={r.discount_percent} onChange={setRef("discount_percent")} inputMode="decimal" /></label>
          <label className="input"><span>Applies to</span>
            <select value={r.discount_duration} onChange={setRef("discount_duration")}>
              <option value="once">First bill only</option><option value="repeating">First few months</option><option value="forever">Every bill</option>
            </select>
          </label>
          {r.discount_duration === "repeating" && (
            <label className="input"><span>Months</span><input value={r.discount_months} onChange={setRef("discount_months")} inputMode="numeric" /></label>
          )}
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>Coins per activity</h3>
        <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>
          Set coins to 0 to switch an activity off. "Limit" is how many times one student can earn it; leave blank for no limit.
        </p>
        {Object.entries(settings.rules).map(([key, rule]) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 6rem 6rem", gap: "0.75rem", alignItems: "center", padding: "0.55rem 0", borderTop: "1px solid var(--rule-soft)" }}>
            <span style={{ fontSize: "0.9rem" }}>{rule.label}</span>
            <input aria-label={`Coins for ${rule.label}`} value={rule.coins} onChange={setRule(key, "coins")} inputMode="numeric" />
            <input aria-label={`Limit for ${rule.label}`} value={rule.limit ?? ""} onChange={setRule(key, "limit")} inputMode="numeric" placeholder="no limit" />
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 6rem 6rem", gap: "0.75rem", fontSize: "0.72rem", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.25rem" }}>
          <span></span><span>Coins</span><span>Limit</span>
        </div>
        <p className="text-muted" style={{ fontSize: "0.78rem", margin: "1rem 0 0" }}>
          What students can spend coins on hasn't been decided yet — their balances simply build up until it is.
        </p>
      </section>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.75rem" }}>
        <button className="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
        {msg.text && <span style={{ fontSize: "0.86rem", color: msg.error ? "var(--error-deep)" : "var(--success-deep)" }}>{msg.text}</span>}
      </div>

      <StudentCoins />
    </div>
  );
}

function StudentCoins() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null); // { user, ledger, balance }
  const [adj, setAdj] = useState({ amount: "", note: "" });
  const [msg, setMsg] = useState({ text: "", error: false });

  const search = (term) => apiFetch(`/api/admin/referrals/coins/users?q=${encodeURIComponent(term)}`).then(setRows).catch(() => setRows([]));
  useEffect(() => { const t = setTimeout(() => search(q), 300); return () => clearTimeout(t); }, [q]);

  const openUser = async (u) => {
    setMsg({ text: "", error: false }); setAdj({ amount: "", note: "" });
    const r = await apiFetch(`/api/admin/referrals/coins/users/${u.id}`);
    setOpen({ user: u, ...r });
  };

  const adjust = async (e) => {
    e.preventDefault();
    setMsg({ text: "", error: false });
    try {
      const r = await apiFetch(`/api/admin/referrals/coins/users/${open.user.id}/adjust`, { method: "POST", body: JSON.stringify(adj) });
      setMsg({ text: `Done — balance is now ${r.balance}.`, error: false });
      await openUser(open.user); search(q);
    } catch (er) { setMsg({ text: er.message, error: true }); }
  };

  return (
    <section className="card">
      <h3 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Students' coins</h3>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or invite code" style={{ width: "100%", marginBottom: "0.75rem" }} aria-label="Search students" />
      {rows.map((u) => (
        <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", padding: "0.5rem 0", borderTop: "1px solid var(--rule-soft)", fontSize: "0.88rem" }}>
          <span style={{ minWidth: 0 }}>
            <strong>{u.name}</strong> <span className="text-muted">· {u.email}{u.referral_code ? ` · ${u.referral_code}` : ""}</span>
            <span className="text-muted" style={{ display: "block", fontSize: "0.76rem" }}>invited {u.invited}, {u.invited_paying} subscribed</span>
          </span>
          <span style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <strong>{u.balance.toLocaleString()}</strong>
            <button className="button ghost" style={{ fontSize: "0.74rem", padding: "0.25rem 0.6rem" }} onClick={() => openUser(u)}>History</button>
          </span>
        </div>
      ))}
      {rows.length === 0 && <p className="muted" style={{ margin: 0 }}>No students found.</p>}

      {open && (
        <div style={{ marginTop: "1.25rem", borderTop: "2px solid var(--rule)", paddingTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
            <strong>{open.user.name}</strong><span>Balance <strong>{open.balance.toLocaleString()}</strong></span>
          </div>
          <form onSubmit={adjust} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end", margin: "0.75rem 0" }}>
            <label className="input" style={{ marginBottom: 0, width: "7rem" }}><span>Coins (+/−)</span><input value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} inputMode="numeric" placeholder="-50" /></label>
            <label className="input" style={{ marginBottom: 0, flex: 1, minWidth: "12rem" }}><span>Reason (shown to the student)</span><input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></label>
            <button className="button" type="submit">Adjust</button>
          </form>
          {msg.text && <p style={{ fontSize: "0.85rem", margin: "0 0 0.5rem", color: msg.error ? "var(--error-deep)" : "var(--success-deep)" }}>{msg.text}</p>}
          {open.ledger.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.4rem 0", borderTop: "1px solid var(--rule-soft)", fontSize: "0.84rem" }}>
              <span>{l.reason}{l.note ? ` — ${l.note}` : ""}<span className="text-muted" style={{ fontSize: "0.74rem", display: "block" }}>{fmtDateTime(l.created_at)}{l.by_email ? ` · by ${l.by_email}` : ""}</span></span>
              <strong style={{ color: l.amount >= 0 ? "var(--success-deep)" : "var(--error-deep)" }}>{l.amount >= 0 ? "+" : ""}{l.amount}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
