import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fmtDate, fmtDateTime } from "../utils/date.js";

// Admin → Affiliates. Approve applications, set each partner's terms, watch their numbers,
// reverse a bad commission, and record payouts.

const usd = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS = {
  pending: { bg: "#fef3c7", fg: "#92400e", label: "Applied" },
  active: { bg: "var(--success-soft)", fg: "var(--success-deep)", label: "Active" },
  paused: { bg: "var(--surface-warm, #f3f4f6)", fg: "var(--ink-muted)", label: "Paused" },
  rejected: { bg: "var(--error-soft)", fg: "var(--error-deep)", label: "Rejected" }
};
const COMM_STATUS = {
  pending: { fg: "var(--ink-muted)", label: "In hold" },
  approved: { fg: "var(--success-deep)", label: "Ready to pay" },
  paid: { fg: "var(--ink)", label: "Paid" },
  reversed: { fg: "var(--error-deep)", label: "Reversed" }
};
const Badge = ({ s }) => {
  const st = STATUS[s] || STATUS.pending;
  return <span className="badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>;
};

export default function AffiliateAdmin() {
  const [list, setList] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState("");

  const load = () => apiFetch("/api/admin/referrals/affiliates").then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  if (openId) return <PartnerDetail id={openId} onBack={() => { setOpenId(null); load(); }} />;
  if (!list) return <p className="muted">{msg || "Loading partners…"}</p>;

  const pending = list.filter((a) => a.status === "pending");
  const owedTotal = list.reduce((s, a) => s + Number(a.owed || 0), 0);

  return (
    <div>
      {pending.length > 0 && (
        <div className="card compact" style={{ marginBottom: "1rem", background: "#fef3c7", color: "#92400e" }}>
          {pending.length} partner application{pending.length === 1 ? "" : "s"} waiting for review — shown first below.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <Stat label="Partners" value={list.filter((a) => a.status === "active").length} />
        <Stat label="Sign-ups via partners" value={list.reduce((s, a) => s + Number(a.signups || 0), 0)} />
        <Stat label="Paying via partners" value={list.reduce((s, a) => s + Number(a.paying || 0), 0)} />
        <Stat label="Owed to partners now" value={usd(owedTotal)} accent={owedTotal > 0} />
      </div>

      <section className="card">
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse", fontSize: "0.87rem" }}>
            <thead>
              <tr style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", textAlign: "left" }}>
                <th style={th}>Partner</th><th style={th}>Code</th><th style={th}>Status</th>
                <th style={thr}>Visits</th><th style={thr}>Sign-ups</th><th style={thr}>Paying</th>
                <th style={thr}>In hold</th><th style={thr}>Owed</th><th style={thr}>Paid</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={10} className="muted" style={{ padding: "1.5rem 0", textAlign: "center" }}>No partners yet. Applications from /partners appear here.</td></tr>}
              {list.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--rule-soft)" }}>
                  <td style={td}><strong>{a.organisation || a.name}</strong><div className="text-muted" style={{ fontSize: "0.78rem" }}>{a.name} · {a.email}</div></td>
                  <td style={{ ...td, fontFamily: "ui-monospace, monospace" }}>{a.code || "—"}</td>
                  <td style={td}><Badge s={a.status} /></td>
                  <td style={tdr}>{a.clicks}</td><td style={tdr}>{a.signups}</td><td style={tdr}>{a.paying}</td>
                  <td style={tdr}>{usd(a.pending)}</td>
                  <td style={{ ...tdr, color: Number(a.owed) > 0 ? "var(--success-deep)" : undefined, fontWeight: Number(a.owed) > 0 ? 700 : 400 }}>{usd(a.owed)}</td>
                  <td style={tdr}>{usd(a.paid)}</td>
                  <td style={{ ...td, textAlign: "right" }}><button className="button ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }} onClick={() => setOpenId(a.id)}>{a.status === "pending" ? "Review" : "Open"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ background: accent ? "var(--success-soft)" : "var(--surface-warm, #f6f7f9)", borderRadius: "var(--r-md)", padding: "0.9rem 1rem" }}>
      <div style={{ fontSize: "0.78rem", color: accent ? "var(--success-deep)" : "var(--ink-muted)" }}>{label}</div>
      <div style={{ fontSize: "1.45rem", fontWeight: 700, color: accent ? "var(--success-deep)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}

function PartnerDetail({ id, onBack }) {
  const [a, setA] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", error: false });
  const [payout, setPayout] = useState({ method: "", reference: "" });

  const load = () => apiFetch(`/api/admin/referrals/affiliates/${id}`).then((r) => {
    setA(r);
    setF({
      code: r.code || "", commission_type: r.commission_type, commission_value: Number(r.commission_value),
      commission_scope: r.commission_scope, commission_months: r.commission_months, earned_on: r.earned_on,
      hold_days: r.hold_days, discount_percent: Number(r.discount_percent), discount_duration: r.discount_duration,
      discount_months: r.discount_months, min_payout: Number(r.min_payout), admin_notes: r.admin_notes || ""
    });
    setPayout((p) => ({ ...p, method: p.method || r.payout_method || "" }));
  }).catch((e) => setMsg({ text: e.message, error: true }));
  useEffect(() => { load(); }, [id]);

  const save = async (status) => {
    setBusy(status || "save"); setMsg({ text: "", error: false });
    try {
      await apiFetch(`/api/admin/referrals/affiliates/${id}`, { method: "PUT", body: JSON.stringify({ ...f, ...(status ? { status } : {}) }) });
      setMsg({ text: status === "active" && a.status !== "active" ? "Approved — the partner can see their link now." : status ? `Partner ${status}.` : "Terms saved. They apply to students referred from now on.", error: false });
      await load();
    } catch (e) { setMsg({ text: e.message, error: true }); }
    finally { setBusy(""); }
  };

  const reverse = async (cid) => {
    const note = window.prompt("Why are you reversing this commission? (shown in the record)");
    if (!note) return;
    try { await apiFetch(`/api/admin/referrals/commissions/${cid}/reverse`, { method: "POST", body: JSON.stringify({ note }) }); await load(); }
    catch (e) { setMsg({ text: e.message, error: true }); }
  };

  const recordPayout = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Record that you've transferred ${usd(owed)} to ${a.organisation || a.name}?`)) return;
    setBusy("payout"); setMsg({ text: "", error: false });
    try {
      const r = await apiFetch(`/api/admin/referrals/affiliates/${id}/payouts`, { method: "POST", body: JSON.stringify(payout) });
      setMsg({ text: `Payout of ${usd(r.amount)} recorded, covering ${r.commissions} commission${r.commissions === 1 ? "" : "s"}.`, error: false });
      setPayout({ method: payout.method, reference: "" });
      await load();
    } catch (er) { setMsg({ text: er.message, error: true }); }
    finally { setBusy(""); }
  };

  if (!a || !f) return <p className="muted">{msg.text || "Loading…"}</p>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const owed = a.commissions.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      <button className="button ghost" style={{ fontSize: "0.8rem", marginBottom: "1rem" }} onClick={onBack}>← All partners</button>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <h2 className="section-title" style={{ fontSize: "1.3rem", marginBottom: "0.2rem" }}>{a.organisation || a.name}</h2>
            <div className="text-muted" style={{ fontSize: "0.85rem" }}>
              {a.name} · {a.email}{a.phone ? ` · ${a.phone}` : ""} · applied {fmtDate(a.created_at)}
              {a.website && <> · <a href={a.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-deep)" }}>website</a></>}
            </div>
            {a.audience && <p style={{ fontSize: "0.88rem", margin: "0.5rem 0 0", color: "var(--ink-soft)" }}><strong>Audience:</strong> {a.audience}</p>}
          </div>
          <Badge s={a.status} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <label className="input"><span>Referral code</span>
            <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="KRUPOOM" style={{ fontFamily: "ui-monospace, monospace" }} />
          </label>
          <label className="input"><span>Commission</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select value={f.commission_type} onChange={set("commission_type")} style={{ flex: 1, minWidth: 0 }}>
                <option value="percent">% of payment</option>
                <option value="fixed">Fixed $ per student</option>
              </select>
              <input value={f.commission_value} onChange={set("commission_value")} inputMode="decimal" style={{ width: "5rem" }} />
            </div>
          </label>
          <label className="input"><span>Commission earned on</span>
            <select value={f.commission_scope} onChange={set("commission_scope")} disabled={f.commission_type === "fixed" || f.earned_on === "signup"}>
              <option value="first">First payment only</option>
              <option value="months">Every payment, for a set time</option>
              <option value="forever">Every payment, forever</option>
            </select>
          </label>
          {f.commission_scope === "months" && f.commission_type === "percent" && f.earned_on === "payment" && (
            <label className="input"><span>For how many months</span>
              <input value={f.commission_months} onChange={set("commission_months")} inputMode="numeric" />
            </label>
          )}
          <label className="input"><span>Earned when</span>
            <select value={f.earned_on} onChange={set("earned_on")}>
              <option value="payment">Student pays</option>
              <option value="signup">Student signs up (free)</option>
            </select>
            {f.earned_on === "signup" && (
              <span style={{ fontSize: "0.76rem", color: "var(--error-deep)" }}>Sign-up is free, so this pays for accounts that may never subscribe — and invites fake ones. The value is paid as a flat $ amount.</span>
            )}
          </label>
          <label className="input"><span>Hold before payable (days)</span>
            <input value={f.hold_days} onChange={set("hold_days")} inputMode="numeric" />
          </label>
          <label className="input"><span>New-student discount</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input value={f.discount_percent} onChange={set("discount_percent")} inputMode="decimal" style={{ width: "4.5rem" }} aria-label="Discount percent" />
              <select value={f.discount_duration} onChange={set("discount_duration")} style={{ flex: 1, minWidth: 0 }}>
                <option value="once">% off first bill</option>
                <option value="repeating">% off for some months</option>
                <option value="forever">% off every bill</option>
              </select>
            </div>
          </label>
          {f.discount_duration === "repeating" && (
            <label className="input"><span>Discount months</span>
              <input value={f.discount_months} onChange={set("discount_months")} inputMode="numeric" />
            </label>
          )}
          <label className="input"><span>Minimum payout ($)</span>
            <input value={f.min_payout} onChange={set("min_payout")} inputMode="decimal" />
          </label>
        </div>
        <label className="input"><span>Admin notes <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(partner can't see these)</span></span>
          <textarea rows={2} value={f.admin_notes} onChange={set("admin_notes")} />
        </label>

        <div style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <span className="text-muted" style={{ fontSize: "0.8rem", maxWidth: "48ch" }}>Changes apply to students referred from now on. Earlier referrals keep the terms they joined under.</span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {a.status === "pending" && <button className="button ghost" disabled={!!busy} onClick={() => save("rejected")}>Reject</button>}
            {a.status === "active" && <button className="button ghost" disabled={!!busy} onClick={() => save("paused")}>Pause</button>}
            {(a.status === "paused" || a.status === "rejected") && <button className="button ghost" disabled={!!busy} onClick={() => save("active")}>Reactivate</button>}
            {a.status === "pending"
              ? <button className="button" disabled={!!busy} onClick={() => save("active")}>{busy === "active" ? "Approving…" : "Approve"}</button>
              : <button className="button" disabled={!!busy} onClick={() => save(null)}>{busy === "save" ? "Saving…" : "Save terms"}</button>}
          </div>
        </div>
        {msg.text && <p style={{ margin: "0.75rem 0 0", fontSize: "0.86rem", color: msg.error ? "var(--error-deep)" : "var(--success-deep)" }}>{msg.text}</p>}
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <h3 className="section-title" style={{ fontSize: "1.05rem", margin: 0 }}>Pay this partner</h3>
          <span style={{ fontSize: "1.2rem", fontWeight: 700, color: owed > 0 ? "var(--success-deep)" : "var(--ink-muted)" }}>{usd(owed)} ready</span>
        </div>
        <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>
          Sends: {a.payout_method || "no method set"}{a.payout_details ? ` · ${a.payout_details}` : ""}{a.tax_id ? ` · tax ID ${a.tax_id}` : " · no tax ID on file"}.
          {Number(owed) > 0 && Number(owed) < Number(a.min_payout) && ` Below their ${usd(a.min_payout)} minimum.`}
        </p>
        <form onSubmit={recordPayout} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="input" style={{ marginBottom: 0 }}><span>Method</span>
            <select value={payout.method} onChange={(e) => setPayout({ ...payout, method: e.target.value })}>
              <option value="">—</option><option value="promptpay">PromptPay</option><option value="bank">Bank transfer</option><option value="other">Other</option>
            </select>
          </label>
          <label className="input" style={{ marginBottom: 0, flex: 1, minWidth: "12rem" }}><span>Transfer reference</span>
            <input value={payout.reference} onChange={(e) => setPayout({ ...payout, reference: e.target.value })} placeholder="Bank slip or transaction number" />
          </label>
          <button className="button" type="submit" disabled={!!busy || !(owed > 0)}>{busy === "payout" ? "Recording…" : "Record transfer"}</button>
        </form>
        <p className="text-muted" style={{ fontSize: "0.76rem", margin: "0.6rem 0 0" }}>Make the transfer first, then record it. This marks every ready commission as paid.</p>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 className="section-title" style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Commissions</h3>
        {a.commissions.length === 0 ? <p className="muted" style={{ margin: 0 }}>None yet.</p> : (
          <div className="table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead><tr style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", textAlign: "left" }}>
                <th style={th}>Date</th><th style={th}>Student</th><th style={thr}>They paid</th><th style={thr}>Commission</th><th style={th}>Status</th><th style={th}></th>
              </tr></thead>
              <tbody>
                {a.commissions.map((c) => {
                  const st = COMM_STATUS[c.status] || COMM_STATUS.pending;
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid var(--rule-soft)" }}>
                      <td style={td}>{fmtDate(c.created_at)}</td>
                      <td style={td}>{c.student_name || "deleted account"}<div className="text-muted" style={{ fontSize: "0.75rem" }}>{c.student_email || ""}{c.kind === "signup" ? " · sign-up" : ""}</div></td>
                      <td style={tdr}>{c.kind === "signup" ? "—" : usd(c.amount_paid)}</td>
                      <td style={{ ...tdr, fontWeight: 600 }}>{usd(c.amount)}</td>
                      <td style={td}><span style={{ color: st.fg, fontWeight: 600 }}>{st.label}</span>
                        <div className="text-muted" style={{ fontSize: "0.74rem" }}>{c.status === "pending" ? `until ${fmtDate(c.available_at)}` : c.note || ""}</div></td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {(c.status === "pending" || c.status === "approved") &&
                          <button className="button ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }} onClick={() => reverse(c.id)}>Reverse</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {a.payouts.length > 0 && (
        <section className="card">
          <h3 className="section-title" style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Payouts</h3>
          {a.payouts.map((p, i) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.5rem 0", borderTop: i ? "1px solid var(--rule-soft)" : "none", fontSize: "0.88rem" }}>
              <span>{fmtDateTime(p.paid_at)}{p.method ? ` · ${p.method}` : ""}{p.reference ? ` · ${p.reference}` : ""}<span className="text-muted"> · recorded by {p.recorded_by_email || "admin"}</span></span>
              <strong>{usd(p.amount)}</strong>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

const th = { padding: "0.45rem 0.5rem 0.45rem 0" };
const thr = { ...th, textAlign: "right" };
const td = { padding: "0.6rem 0.5rem 0.6rem 0", verticalAlign: "top" };
const tdr = { ...td, textAlign: "right" };
