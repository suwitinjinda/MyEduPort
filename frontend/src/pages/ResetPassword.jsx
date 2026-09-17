import React, { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

// One page, two modes: with ?token=... it sets a new password; without, it
// requests a reset link. The backend never reveals whether an email exists.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setBusy(true); setStatus("");
    try {
      const r = await apiFetch("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setDone(true);
      setStatus(r?.message || "If an account exists for that email, a reset link has been sent.");
    } catch (err) {
      setStatus(err?.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  const submitNewPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setStatus("New password must be at least 6 characters long."); return; }
    if (password !== confirm) { setStatus("Passwords do not match."); return; }
    setBusy(true); setStatus("");
    try {
      const r = await apiFetch("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, newPassword: password }) });
      setStatus(r?.status || "Password has been reset.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setStatus(err?.message || "This reset link is invalid or has expired.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "3rem auto" }}>
      <div className="card" style={{ padding: "2rem" }}>
        <div className="eyebrow">Account</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--ink)", marginBottom: "0.75rem" }}>
          {token ? "Set a new password" : "Reset your password"}
        </h1>

        {token ? (
          <form onSubmit={submitNewPassword}>
            <div className="input">
              <label>New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="input">
              <label>Confirm new password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
            </div>
            <button className="button" type="submit" disabled={busy} style={{ width: "100%", marginTop: "0.5rem" }}>
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        ) : (
          <form onSubmit={requestReset}>
            <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
              Enter your account email and we'll send a reset link.
            </p>
            <div className="input">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" disabled={done} />
            </div>
            <button className="button" type="submit" disabled={busy || done} style={{ width: "100%", marginTop: "0.5rem" }}>
              {busy ? "Sending…" : done ? "Sent" : "Send reset link"}
            </button>
          </form>
        )}

        {status && (
          <p style={{ marginTop: "1rem", fontSize: "0.88rem", color: "var(--ink-soft)" }}>{status}</p>
        )}

        <div style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}>
          <Link to="/login" style={{ color: "var(--teal-deep)", textDecoration: "underline" }}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
