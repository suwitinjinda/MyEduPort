import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, clearToken, getUserRole, getToken, API_URL } from "../api/client";
import { fmtDate, fmtDateTime } from "../utils/date.js";

// Putting a backup ZIP back into the account. Deliberately two steps: the preview reads
// the file and shows what it holds next to what the student has now, so the swap is
// visible before anything is replaced. Nothing is written until they confirm.
function RestoreSection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", error: false });
  const [open, setOpen] = useState(false);

  const send = async (step, extra) => {
    const form = new FormData();
    form.append("backup", file);
    if (extra) Object.entries(extra).forEach(([k, v]) => form.append(k, v));
    const res = await fetch(`${API_URL}/api/students/me/restore/${step}`, {
      method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: form
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Restore failed (${res.status})`);
    return body;
  };

  const check = async () => {
    setBusy("preview"); setMsg({ text: "", error: false }); setPreview(null);
    try { setPreview(await send("preview")); }
    catch (e) { setMsg({ text: e.message, error: true }); }
    finally { setBusy(""); }
  };

  const apply = async () => {
    setBusy("apply"); setMsg({ text: "", error: false });
    try {
      const r = await send("apply", { confirm: "REPLACE" });
      const n = Object.entries(r.restored || {}).filter(([, v]) => typeof v === "number" && v > 0)
        .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(", ");
      setMsg({ text: `Restored${n ? ": " + n : ""}. Reload the page to see it.`, error: false });
      setPreview(null); setFile(null);
    } catch (e) {
      setMsg({ text: e.message, error: true });
    } finally { setBusy(""); }
  };

  const row = (label, now, after) => (
    <tr key={label} style={{ borderTop: "1px solid var(--rule-soft)" }}>
      <td style={{ padding: "0.35rem 0.75rem 0.35rem 0", fontSize: "0.85rem" }}>{label}</td>
      <td style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", color: "var(--ink-muted)" }}>{now ?? "—"}</td>
      <td style={{ padding: "0.35rem 0", fontSize: "0.85rem", fontWeight: 600 }}>{after ?? "—"}</td>
    </tr>
  );

  if (!open) {
    return (
      <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--rule-soft)" }}>
        <button className="button ghost" onClick={() => setOpen(true)}>↥ Restore from a backup</button>
        <span className="text-muted" style={{ fontSize: "0.78rem", marginLeft: "0.6rem" }}>
          Put a backup ZIP back into your account.
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--rule-soft)" }}>
      <strong style={{ fontSize: "0.95rem" }}>Restore from a backup</strong>
      <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0.3rem 0 0.75rem" }}>
        Restoring <strong>replaces</strong> what is in your account now — it does not merge.
        Take a backup of your current work first if you might want it back.
      </p>

      <input type="file" accept=".zip,application/zip" aria-label="Your backup ZIP"
        onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setMsg({ text: "", error: false }); }} />

      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        <button className="button ghost" disabled={!file || !!busy} onClick={check}>
          {busy === "preview" ? "Reading…" : "Check this file"}
        </button>
        <button className="button ghost" onClick={() => { setOpen(false); setFile(null); setPreview(null); setMsg({ text: "", error: false }); }}>
          Cancel
        </button>
      </div>

      {preview && (
        <div className="card compact" style={{ marginTop: "1rem", background: "var(--surface)" }}>
          <p style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
            Backup taken <strong>{fmtDateTime(preview.taken_at)}</strong>
            {preview.files_in_zip > 0 && ` · ${preview.files_in_zip} uploaded file(s)`}
          </p>
          {preview.different_account && (
            <p style={{ fontSize: "0.82rem", color: "var(--error-deep)", margin: "0 0 0.5rem" }}>
              This backup belongs to <strong>{preview.from_account}</strong>, not this account. Restoring it
              will put that person&apos;s work into your portfolio.
            </p>
          )}
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
                <th style={{ textAlign: "left", padding: "0 0.75rem 0.35rem 0" }}>Section</th>
                <th style={{ textAlign: "left", padding: "0 0.75rem 0.35rem" }}>You have now</th>
                <th style={{ textAlign: "left", padding: "0 0 0.35rem" }}>After restoring</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(preview.will_restore)
                .filter((k) => k !== "personal_statement")
                .map((k) => row(k.replace(/_/g, " "), preview.you_have_now?.[k], preview.will_restore[k]))}
              {preview.will_restore.personal_statement && row("personal statement", "replaced", "from backup")}
            </tbody>
          </table>
          <button className="button" style={{ marginTop: "0.85rem", background: "var(--error-deep)" }}
            disabled={!!busy} onClick={apply}>
            {busy === "apply" ? "Restoring…" : "Replace my work with this backup"}
          </button>
        </div>
      )}

      {msg.text && (
        <p style={{ fontSize: "0.84rem", marginTop: "0.75rem", color: msg.error ? "var(--error-deep)" : "var(--success-deep)" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

function ShareSection() {
  const [token, setToken] = useState(null);
  const [expires, setExpires] = useState(null);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const r = await apiFetch("/api/students/me/share-token", {
        method: "POST",
        body: JSON.stringify({ expires_in_days: Number(days) })
      });
      setToken(r.token);
      setExpires(r.expires_at);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/students/me/share-token", { method: "DELETE" });
      setToken(null);
      setExpires(null);
    } finally {
      setBusy(false);
    }
  };

  const link = token ? `${window.location.origin}/share/${token}` : null;

  return (
    <section className="card" style={{ marginBottom: "1.5rem", padding: "2rem" }}>
      <h2 className="section-title" style={{ fontSize: "1.35rem" }}>Share your portfolio</h2>
      <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1rem" }}>
        Generate a read-only link that anyone with the URL can view — for counselors, teachers, or recommenders. No sign-in needed.
      </p>

      <div className="grid two" style={{ alignItems: "end" }}>
        <div className="input" style={{ marginBottom: 0 }}>
          <label>Expires after (days)</label>
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="button gold" onClick={create} disabled={busy}>
            {token ? "Regenerate link" : "Generate share link"}
          </button>
          {token && (
            <button className="button ghost" onClick={revoke} disabled={busy} style={{ color: "var(--error)", borderColor: "var(--error)" }}>
              Revoke
            </button>
          )}
        </div>
      </div>

      {link && (
        <div style={{ marginTop: "1.25rem", padding: "1rem", background: "var(--surface-warm)", borderLeft: "2px solid var(--gold)" }}>
          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.4rem" }}>Active share link</div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <code className="mono" style={{ flex: 1, padding: "0.5rem 0.75rem", background: "var(--surface)", border: "1px solid var(--rule)", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {link}
            </code>
            <button
              className="button ghost"
              onClick={() => { navigator.clipboard.writeText(link); }}
              style={{ padding: "0.5rem 0.85rem", fontSize: "0.7rem" }}
            >
              Copy
            </button>
          </div>
          {expires && (
            <p className="text-muted" style={{ marginTop: "0.65rem" }}>
              Expires {fmtDate(expires)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [billing, setBilling] = useState(null);
  const [portalBusy, setPortalBusy] = useState(false);
  useEffect(() => { apiFetch("/api/billing/status").then(setBilling).catch(() => {}); }, []);
  const openPortal = async () => {
    setPortalBusy(true);
    try { const r = await apiFetch("/api/billing/portal", { method: "POST" }); window.location.assign(r.url); }
    catch (err) { setStatus(err.message); setPortalBusy(false); }
  };
  const [authProvider, setAuthProvider] = useState("password");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordStatus, setPasswordStatus] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/me").then((u) => setAuthProvider(u.auth_provider || "password")).catch(() => {});
  }, []);

  const isGoogleOnly = authProvider === "google";

  // Downloads a ZIP: every field as JSON, each essay and draft as plain text, and the
  // documents the student actually uploaded. Streamed from the server, so this goes
  // through fetch directly rather than apiFetch (which parses JSON).
  const [backingUp, setBackingUp] = useState(false);
  const downloadMyData = async () => {
    setBackingUp(true);
    setStatus("Packing up your work… this can take a moment.");
    try {
      const res = await fetch(`${API_URL}/api/students/me/backup`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg.error || `Backup failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `myeduport-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Backup downloaded. Keep it somewhere safe — it has your essays and documents in it.");
    } catch (err) {
      setStatus(err.message || "Could not create your backup");
    } finally {
      setBackingUp(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPasswordStatus("");
    if (!isGoogleOnly && !passwordData.currentPassword) { setPasswordStatus("Enter your current password"); return; }
    if (!passwordData.newPassword || !passwordData.confirmPassword) { setPasswordStatus("Please fill in all fields"); return; }
    if (passwordData.newPassword.length < 6) { setPasswordStatus("New password must be at least 6 characters"); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { setPasswordStatus("New passwords do not match"); return; }
    if (!isGoogleOnly && passwordData.currentPassword === passwordData.newPassword) { setPasswordStatus("New password must differ from current"); return; }
    try {
      await apiFetch("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: isGoogleOnly ? undefined : passwordData.currentPassword, newPassword: passwordData.newPassword })
      });
      setPasswordStatus(isGoogleOnly ? "Password set. You can now sign in with email and password." : "Password updated.");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => { setShowPasswordReset(false); setPasswordStatus(""); }, 2000);
    } catch (err) {
      setPasswordStatus(err.message || "Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { setStatus("Please type 'DELETE' to confirm"); return; }
    if (!window.confirm("Are you absolutely sure? This permanently deletes your account.")) return;
    try {
      await apiFetch("/api/auth/me", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) });
      setStatus("Account deleted. Redirecting…");
      clearToken();
      window.dispatchEvent(new Event("auth-change"));
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setStatus(err.message || "Failed to delete account");
    }
  };

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Account</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Settings.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem" }}>
          Manage your password, data, and account deletion.
        </p>
      </header>

      {/* Subscription (Stripe) */}
      {billing && (
        <section className="card" style={{ marginBottom: "1.5rem", padding: "2rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.35rem" }}>Subscription</h2>
          <p style={{ fontSize: "0.95rem", margin: "0.25rem 0 1rem" }}>
            Current plan: <strong style={{ textTransform: "capitalize" }}>{billing.plan}</strong>
            {billing.cycle && <> · billed {billing.cycle === "annual" ? "yearly" : "monthly"}</>}
            {billing.renews_at && billing.has_subscription && <> · renews {fmtDate(billing.renews_at)}</>}
            {billing.status && billing.status !== "active" && <> · <span style={{ color: "var(--warn)" }}>{billing.status.replace("_", " ")}</span></>}
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {billing.can_manage ? (
              <button className="button" onClick={openPortal} disabled={portalBusy}>{portalBusy ? "Opening…" : "Manage subscription"}</button>
            ) : (
              <Link to="/pricing" className="button">See plans</Link>
            )}
          </div>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.75rem" }}>Change plan, update your card, download invoices or cancel — handled securely by Stripe.</p>
        </section>
      )}

      {/* Privacy & Data */}
      <section className="card" style={{ marginBottom: "1.5rem", padding: "2rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.35rem" }}>Privacy & Data</h2>
        <p className="muted" style={{ fontSize: "0.92rem" }}>
          Your work is yours. Take a full backup whenever you like, or delete your account
          and everything in it below.
        </p>
        {getUserRole() === "student" && (
          <>
            <button className="button" style={{ marginTop: "1rem" }} disabled={backingUp} onClick={downloadMyData}>
              {backingUp ? "Packing…" : "↓ Back up my work (ZIP)"}
            </button>
            <ul className="list" style={{ marginTop: "0.85rem", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
              <li>Your essays and every earlier draft, as plain text you can open anywhere</li>
              <li>The documents you uploaded — the actual files, not just their names</li>
              <li>Grades, tests, activities, awards, tasks, saved universities and admission results</li>
              <li>Your Personal and Career test results, and the MEPAi advice you've saved</li>
            </ul>
            <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.5rem" }}>
              This is a copy for you to keep. Downloading it changes nothing in your account.
            </p>
            <RestoreSection />
          </>
        )}
      </section>

      {getUserRole() === "student" && <ShareSection />}

      {/* Password */}
      <section className="card" style={{ marginBottom: "1.5rem", padding: "2rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.35rem" }}>{isGoogleOnly ? "Set password" : "Change password"}</h2>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1rem" }}>
          {isGoogleOnly
            ? "Add a password so you can also sign in with email."
            : "Update your account password. Use a strong, unique password."}
        </p>

        {!showPasswordReset ? (
          <button className="button" onClick={() => setShowPasswordReset(true)}>
            {isGoogleOnly ? "Set password" : "Change password"}
          </button>
        ) : (
          <form onSubmit={handlePasswordReset} className="card" style={{ background: "var(--surface-warm)", padding: "1.5rem", marginTop: "1rem" }}>
            {!isGoogleOnly && (
              <div className="input">
                <label>Current password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            )}
            <div className="input">
              <label>New password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="input">
              <label>Confirm new password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>

            {passwordStatus && (
              <p style={{ marginBottom: "1rem", color: passwordStatus.includes("set") || passwordStatus.includes("update") ? "var(--success)" : "var(--error)", fontWeight: 600, fontSize: "0.88rem" }}>
                {passwordStatus}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="button">{isGoogleOnly ? "Set password" : "Update password"}</button>
              <button
                type="button"
                className="button ghost"
                onClick={() => {
                  setShowPasswordReset(false);
                  setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordStatus("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Delete Account */}
      <section className="card" style={{ marginBottom: "1.5rem", padding: "2rem", borderLeft: "3px solid var(--error)" }}>
        <h2 className="section-title" style={{ fontSize: "1.35rem", color: "var(--error)" }}>Delete account</h2>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1rem" }}>
          Permanently delete your account and all associated data. This
          cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            className="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ background: "var(--error)", borderColor: "var(--error)" }}
          >
            Delete my account
          </button>
        ) : (
          <div className="card" style={{ background: "var(--error-soft)", padding: "1.5rem", borderColor: "var(--error)", borderLeft: "3px solid var(--error)" }}>
            <h3 className="subtitle" style={{ color: "var(--error)", marginBottom: "1rem" }}>Confirm deletion</h3>
            <p style={{ marginBottom: "1rem", fontWeight: 600, fontSize: "0.92rem" }}>This will permanently delete:</p>
            <ul className="list" style={{ marginBottom: "1.5rem" }}>
              <li>Your user account</li>
              <li>All profile data</li>
              <li>All academic records, tests, activities, awards</li>
              <li>All uploaded documents</li>
              <li>All essays and AI reports</li>
              <li>All chat history</li>
            </ul>
            <div className="input">
              <label>Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="mono"
                style={{ letterSpacing: "0.15em", fontWeight: 700 }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "DELETE"}
                style={{ background: "var(--error)", borderColor: "var(--error)" }}
              >
                Permanently delete
              </button>
              <button
                className="button ghost"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); setStatus(""); }}
              >
                Cancel
              </button>
            </div>
            {status && <p style={{ marginTop: "1rem", color: status.includes("delete") ? "var(--success)" : "var(--error)", fontWeight: 600 }}>{status}</p>}
          </div>
        )}
      </section>

      {/* Data Consent */}
      <section className="card highlight" style={{ padding: "1.75rem" }}>
        <div className="advisory-label">Data Processing Consent</div>
        <p className="muted" style={{ fontSize: "0.92rem", marginTop: "0.5rem" }}>
          By using MyEduPort, you consent to processing of your data for:
        </p>
        <ul className="list" style={{ marginTop: "0.75rem" }}>
          <li>Personalized university recommendations and guidance</li>
          <li>Improving AI models and services</li>
          <li>Gap analysis and portfolio insights</li>
        </ul>
        <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.75rem" }}>
          Withdraw consent at any time by deleting your account. See our{" "}
          <Link to="/privacy" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>
      </section>
    </div>
  );
}
