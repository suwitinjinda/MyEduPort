import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

// Student Rewards: a personal invite link, and coins earned for inviting friends and for
// using MyEduPort. What coins can be exchanged for hasn't been decided yet, so the page says
// so plainly rather than implying a value.

export default function Rewards() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { apiFetch("/api/ref/rewards").then(setD).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="card"><p style={{ color: "var(--error-deep)" }}>{err}</p></div>;
  if (!d) return <p className="muted">Loading…</p>;

  const copy = async () => {
    try { await navigator.clipboard.writeText(d.link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* select manually */ }
  };
  const fd = d.friend_discount || {};
  const friendGets = !(Number(fd.percent) > 0) ? null
    : fd.duration === "forever" ? `${Number(fd.percent)}% off every bill`
    : fd.duration === "repeating" ? `${Number(fd.percent)}% off for their first ${fd.months} months`
    : `${Number(fd.percent)}% off their first bill`;
  const shareText = `I'm using MyEduPort to build my university portfolio.${friendGets ? ` Join with my link and get ${friendGets}:` : ""} ${d.link}`;
  const referralRule = d.rules.find((r) => r.key === "referral_paid");

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="eyebrow">Rewards</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.1rem", color: "var(--ink)", letterSpacing: "-0.02em", marginTop: "0.3rem" }}>Invite friends, earn coins</h1>
      </header>

      <div className="grid two" style={{ marginBottom: "1.5rem", alignItems: "stretch" }}>
        <section className="card" style={{ background: "var(--success-soft)" }}>
          <div style={{ fontSize: "0.82rem", color: "var(--success-deep)" }}>Your coins</div>
          <div style={{ fontSize: "2.6rem", fontWeight: 800, color: "var(--success-deep)", lineHeight: 1.1 }}>{d.balance.toLocaleString()}</div>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", margin: "0.5rem 0 0" }}>
            Ways to spend coins are on the way. Everything you earn now stays in your balance.
          </p>
        </section>
        <section className="card">
          <div className="text-muted" style={{ fontSize: "0.82rem" }}>Friends you've invited</div>
          <div style={{ display: "flex", gap: "2rem", marginTop: "0.4rem" }}>
            <div><div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{d.invites.signed_up}</div><div className="text-muted" style={{ fontSize: "0.8rem" }}>signed up</div></div>
            <div><div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{d.invites.paying}</div><div className="text-muted" style={{ fontSize: "0.8rem" }}>subscribed</div></div>
          </div>
        </section>
      </div>

      {d.enabled && d.link ? (
        <section className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>Your invite link</h2>
          <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "0.75rem" }}>
            {friendGets ? `Friends who join with it get ${friendGets}` : "Share it with friends"}
            {referralRule ? `, and you get ${referralRule.coins} coins when they subscribe.` : "."}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input readOnly value={d.link} onFocus={(e) => e.target.select()} aria-label="Your invite link"
              style={{ flex: 1, minWidth: 0, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem", padding: "0.6rem 0.8rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface-warm, #f8fafc)", color: "var(--ink)" }} />
            <button className="button ghost" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <a className="button ghost" style={{ fontSize: "0.82rem" }} target="_blank" rel="noopener noreferrer"
              href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(d.link)}`}>Share on LINE</a>
            <a className="button ghost" style={{ fontSize: "0.82rem" }} target="_blank" rel="noopener noreferrer"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(d.link)}`}>Facebook</a>
            {typeof navigator !== "undefined" && navigator.share && (
              <button className="button ghost" style={{ fontSize: "0.82rem" }}
                onClick={() => navigator.share({ text: shareText, url: d.link }).catch(() => {})}>More…</button>
            )}
          </div>
          <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.75rem 0 0" }}>Your code: <strong>{d.code}</strong> — friends can also type it when they sign up.</p>
        </section>
      ) : (
        <section className="card" style={{ marginBottom: "1.5rem" }}>
          <p className="muted" style={{ margin: 0 }}>Invites are paused at the moment.</p>
        </section>
      )}

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>How to earn coins</h2>
        {d.rules.map((r) => (
          <div key={r.key} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.55rem 0", borderTop: "1px solid var(--rule-soft)", fontSize: "0.9rem" }}>
            <span>{r.label}{r.limit ? <span className="text-muted" style={{ fontSize: "0.8rem" }}> · {r.limit === 1 ? "once" : `up to ${r.limit} times`}</span> : null}</span>
            <strong style={{ color: "var(--success-deep)", whiteSpace: "nowrap" }}>+{r.coins}</strong>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>History</h2>
        {d.history.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No coins yet.</p>
        ) : d.history.map((h, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.55rem 0", borderTop: i ? "1px solid var(--rule-soft)" : "none", fontSize: "0.9rem" }}>
            <span>
              {h.label}{h.note ? <span className="text-muted"> — {h.note}</span> : null}
              <span className="text-muted" style={{ fontSize: "0.78rem", display: "block" }}>{fmtDate(h.created_at)}</span>
            </span>
            <strong style={{ color: h.amount >= 0 ? "var(--success-deep)" : "var(--error-deep)", whiteSpace: "nowrap" }}>
              {h.amount >= 0 ? "+" : ""}{h.amount}
            </strong>
          </div>
        ))}
      </section>
    </div>
  );
}
