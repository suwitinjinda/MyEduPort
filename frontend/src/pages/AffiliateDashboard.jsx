import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

// The partner's own dashboard. Students they referred are shown as initials and grade
// only — the API never sends names or emails here, because the students are minors.

const usd = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Terms written the way a partner would say them
function termsSentence(t) {
  if (!t) return "";
  const rate = t.commission_type === "fixed" ? `${usd(t.commission_value)} per student` : `${Number(t.commission_value)}%`;
  let when;
  if (t.earned_on === "signup") when = `${usd(t.commission_value)} for each student who signs up`;
  else if (t.commission_type === "fixed") when = `${rate} when they first subscribe`;
  else if (t.commission_scope === "first") when = `${rate} of their first payment`;
  else if (t.commission_scope === "months") when = `${rate} of each payment for ${t.commission_months} months`;
  else when = `${rate} of every payment they make`;
  let disc = "";
  if (Number(t.discount_percent) > 0) {
    const d = `${Number(t.discount_percent)}% off`;
    disc = t.discount_duration === "forever" ? `${d} every bill` : t.discount_duration === "repeating" ? `${d} for their first ${t.discount_months} months` : `${d} their first bill`;
  }
  const hold = t.hold_days > 0 ? ` · paid after a ${t.hold_days}-day hold` : "";
  return `You earn ${when}${disc ? ` · new students get ${disc}` : ""}${hold}`;
}

const STATUS_STYLE = {
  paying: { bg: "var(--success-soft)", fg: "var(--success-deep)", label: "Paying" },
  "signed up": { bg: "var(--surface-warm, #f3f4f6)", fg: "var(--ink-muted)", label: "Signed up" },
  refunded: { bg: "var(--error-soft)", fg: "var(--error-deep)", label: "Refunded" }
};

export default function AffiliateDashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [pay, setPay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  const load = () => apiFetch("/api/affiliate/me")
    .then((r) => { setD(r); setPay({ payout_method: r.payout?.method || "", payout_details: r.payout?.details || "", tax_id: r.payout?.tax_id || "", phone: r.payout?.phone || "", website: r.payout?.website || "" }); })
    .catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(d.link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* select manually */ }
  };

  const savePayout = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved("");
    try { await apiFetch("/api/affiliate/me", { method: "PUT", body: JSON.stringify(pay) }); setSaved("Saved."); }
    catch (er) { setSaved(er.message); }
    finally { setSaving(false); }
  };

  if (err) return <div className="card"><p style={{ color: "var(--error-deep)" }}>{err}</p></div>;
  if (!d) return <p className="muted">Loading…</p>;

  const header = (
    <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
      <div>
        <div className="eyebrow">Partner dashboard</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--ink)", letterSpacing: "-0.02em", marginTop: "0.3rem" }}>{d.organisation || d.name}</h1>
        {d.approved_at && <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Partner since {fmtDate(d.approved_at)}</p>}
      </div>
      <span className="badge" style={{
        background: d.status === "active" ? "var(--success-soft)" : d.status === "rejected" ? "var(--error-soft)" : "#fef3c7",
        color: d.status === "active" ? "var(--success-deep)" : d.status === "rejected" ? "var(--error-deep)" : "#92400e"
      }}>{d.status === "pending" ? "Under review" : d.status[0].toUpperCase() + d.status.slice(1)}</span>
    </header>
  );

  const payoutForm = pay && (
    <section className="card">
      <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>Payout details</h2>
      <p className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>Where we send your commission. Only MyEduPort admins can see this.</p>
      <form onSubmit={savePayout} className="grid two" style={{ gap: "0.9rem" }}>
        <label className="input"><span>Method</span>
          <select value={pay.payout_method} onChange={(e) => setPay({ ...pay, payout_method: e.target.value })}>
            <option value="">Choose…</option>
            <option value="promptpay">PromptPay</option>
            <option value="bank">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="input"><span>{pay.payout_method === "bank" ? "Bank, account name and number" : pay.payout_method === "promptpay" ? "PromptPay number" : "Account details"}</span>
          <input value={pay.payout_details} onChange={(e) => setPay({ ...pay, payout_details: e.target.value })} />
        </label>
        <label className="input"><span>Tax ID <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(for withholding tax)</span></span>
          <input value={pay.tax_id} onChange={(e) => setPay({ ...pay, tax_id: e.target.value })} inputMode="numeric" />
        </label>
        <label className="input"><span>Phone</span>
          <input value={pay.phone} onChange={(e) => setPay({ ...pay, phone: e.target.value })} />
        </label>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save payout details"}</button>
          {saved && <span className="text-muted" style={{ fontSize: "0.85rem" }}>{saved}</span>}
        </div>
      </form>
    </section>
  );

  if (d.status === "pending" || d.status === "rejected") {
    return (
      <div>
        {header}
        <section className="card" style={{ marginBottom: "1.25rem" }}>
          {d.status === "pending" ? (
            <>
              <h2 className="section-title" style={{ fontSize: "1.2rem" }}>Thanks for applying</h2>
              <p className="muted" style={{ fontSize: "0.93rem" }}>
                We're reviewing your application. Once it's approved, your personal link, code and terms
                will appear here. You can add your payout details now so we're ready to pay you.
              </p>
            </>
          ) : (
            <>
              <h2 className="section-title" style={{ fontSize: "1.2rem" }}>Application not approved</h2>
              <p className="muted" style={{ fontSize: "0.93rem" }}>
                We weren't able to approve this application. If you think that's a mistake, <Link to="/contact" style={{ color: "var(--teal-deep)" }}>get in touch</Link>.
              </p>
            </>
          )}
        </section>
        {d.status === "pending" && payoutForm}
      </div>
    );
  }

  const metric = (label, value, accent) => (
    <div style={{ background: accent ? "var(--success-soft)" : "var(--surface-warm, #f6f7f9)", borderRadius: "var(--r-md)", padding: "1rem" }}>
      <div style={{ fontSize: "0.8rem", color: accent ? "var(--success-deep)" : "var(--ink-muted)" }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: accent ? "var(--success-deep)" : "var(--ink)" }}>{value}</div>
    </div>
  );
  const rate = d.last30.clicks ? `${((d.last30.paying / d.last30.clicks) * 100).toFixed(1)}%` : "—";

  return (
    <div>
      {header}

      {d.status === "paused" && (
        <div className="card compact" style={{ marginBottom: "1.25rem", background: "#fef3c7", color: "#92400e" }}>
          Your code is paused, so new sign-ups aren't being credited right now. Earnings you've already made are unaffected.
        </div>
      )}

      <section className="card" style={{ marginBottom: "0.85rem" }}>
        <div className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>Your link</div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input readOnly value={d.link || ""} onFocus={(e) => e.target.select()} aria-label="Your referral link"
            style={{ flex: 1, minWidth: 0, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem", padding: "0.6rem 0.8rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface-warm, #f8fafc)", color: "var(--ink)" }} />
          <button className="button ghost" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
        <p className="text-muted" style={{ fontSize: "0.8rem", margin: "0.6rem 0 0" }}>
          Code <strong>{d.code}</strong> · works on any page, e.g. a campaign page like <code>/lp/your-campaign?ref={d.code}</code>, and can be typed at sign-up.
        </p>
      </section>

      <div className="card compact" style={{ marginBottom: "1.5rem", fontSize: "0.88rem", color: "var(--ink-soft)" }}>
        {termsSentence(d.terms)}
      </div>

      <div className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>Last 30 days</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {metric("Link visits", d.last30.clicks.toLocaleString())}
        {metric("Sign-ups", d.last30.signups.toLocaleString())}
        {metric("Paying", d.last30.paying.toLocaleString())}
        {metric("Visit to paying", rate)}
      </div>

      <div className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>Earnings</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.5rem" }}>
        {metric(`In ${d.terms.hold_days}-day hold`, usd(d.earnings.pending))}
        {metric("Ready to pay", usd(d.earnings.approved), true)}
        {metric("Paid to date", usd(d.earnings.paid))}
      </div>
      <p className="text-muted" style={{ fontSize: "0.78rem", marginBottom: "1.5rem" }}>
        Paid by transfer once your ready balance reaches {usd(d.terms.min_payout)}. Earnings from a payment that's refunded during the hold are cancelled.
      </p>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Students you've referred</h2>
        {d.referrals.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No sign-ups yet. Share your link to get started.</p>
        ) : (
          <div className="table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "520px", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", textAlign: "left" }}>
                  <th style={{ padding: "0.4rem 0.5rem 0.4rem 0" }}>Joined</th><th style={{ padding: "0.4rem 0.5rem" }}>Student</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Plan</th><th style={{ padding: "0.4rem 0.5rem" }}>Status</th>
                  <th style={{ padding: "0.4rem 0", textAlign: "right" }}>You earned</th>
                </tr>
              </thead>
              <tbody>
                {d.referrals.map((r, i) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE["signed up"];
                  return (
                    <tr key={i} style={{ borderTop: "1px solid var(--rule-soft)" }}>
                      <td style={{ padding: "0.6rem 0.5rem 0.6rem 0" }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>{r.who}</td>
                      <td style={{ padding: "0.6rem 0.5rem", textTransform: "capitalize" }}>{r.plan || "—"}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}><span className="badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                      <td style={{ padding: "0.6rem 0", textAlign: "right" }}>{r.earned ? usd(r.earned) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-muted" style={{ fontSize: "0.76rem", margin: "0.75rem 0 0" }}>Students are shown by initials only to protect their privacy.</p>
      </section>

      {d.payouts.length > 0 && (
        <section className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Payments to you</h2>
          {d.payouts.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.5rem 0", borderTop: i ? "1px solid var(--rule-soft)" : "none", fontSize: "0.9rem" }}>
              <span>{fmtDate(p.paid_at)}{p.method ? ` · ${p.method}` : ""}{p.reference ? ` · ref ${p.reference}` : ""}</span>
              <strong>{usd(p.amount)}</strong>
            </div>
          ))}
        </section>
      )}

      {payoutForm}
    </div>
  );
}
