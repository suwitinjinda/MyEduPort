import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

// Return page after Stripe Checkout: verifies the payment with Stripe, then shows the new plan.
export default function BillingSuccess() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ phase: "checking" });
  useEffect(() => {
    const id = params.get("session_id");
    if (!id) { setState({ phase: "error", error: "Missing checkout session." }); return undefined; }
    let tries = 0;
    let timer;
    const check = async () => {
      try {
        const r = await apiFetch(`/api/billing/confirm?session_id=${encodeURIComponent(id)}`);
        if (r.status === "complete") setState({ phase: "done", ...r });
        else if (++tries < 10) timer = setTimeout(check, 2000); // payment still processing
        else setState({ phase: "error", error: "Your payment is still processing. Refresh this page in a minute." });
      } catch (err) { setState({ phase: "error", error: err.message }); }
    };
    check();
    return () => clearTimeout(timer);
  }, [params]);

  const name = state.plan ? state.plan[0].toUpperCase() + state.plan.slice(1) : "";
  return (
    <div className="card" style={{ maxWidth: 560, margin: "3rem auto", padding: "2.5rem", textAlign: "center" }}>
      {state.phase === "checking" && <><h1 className="section-title">Confirming your payment…</h1><p className="muted">This takes a few seconds.</p></>}
      {state.phase === "done" && (
        <>
          <div style={{ fontSize: "2.5rem" }}>🎉</div>
          <h1 className="section-title" style={{ marginBottom: "0.5rem" }}>Welcome to {name}!</h1>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>
            Your subscription is active{state.cycle ? ` (billed ${state.cycle === "annual" ? "yearly" : "monthly"})` : ""}
            {state.renews_at ? ` and renews on ${fmtDate(state.renews_at)}` : ""}. All {name} features are unlocked now.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/dashboard" className="button">Go to dashboard →</Link>
            <Link to="/settings" className="button ghost">Manage subscription</Link>
          </div>
        </>
      )}
      {state.phase === "error" && (
        <>
          <h1 className="section-title">We couldn't confirm the payment</h1>
          <p className="muted" style={{ marginBottom: "1.25rem" }}>{state.error}</p>
          <Link to="/pricing" className="button ghost">Back to pricing</Link>
        </>
      )}
    </div>
  );
}
