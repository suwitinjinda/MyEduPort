import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { apiFetch, setToken, getUserRole } from "../api/client";
import GoogleSignIn from "../components/GoogleSignIn";
import { storedReferral, clearReferral } from "../utils/referral.js";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// The discount line follows whatever the admin set for that code
const discountText = (r) => {
  const pct = `${Number(r.discount_percent)}% off`;
  if (!(Number(r.discount_percent) > 0)) return "welcome to MyEduPort";
  if (r.discount_duration === "forever") return `${pct} every bill`;
  if (r.discount_duration === "repeating") return `${pct} for your first ${r.discount_months} months`;
  return `${pct} your first bill`;
};
const homeFor = (role) => (role === "parent" ? "/parent" : role === "counselor" ? "/counselor" : role === "affiliate" ? "/affiliate" : "/dashboard");

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // where to go after signing in: wherever they were sent from (e.g. Pricing), else their home
  const backTo = location.state?.from && location.state.from !== "/login" ? location.state.from : null;
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    data_consent: false,
    ref: storedReferral()?.code || ""
  });
  const [refInfo, setRefInfo] = useState(null); // { valid, from, discount_percent }
  useEffect(() => {
    const code = form.ref.trim();
    if (code.length < 3) { setRefInfo(null); return; }
    const t = setTimeout(() => {
      apiFetch(`/api/ref/check/${encodeURIComponent(code)}`).then(setRefInfo).catch(() => setRefInfo(null));
    }, 400);
    return () => clearTimeout(t);
  }, [form.ref]);
  const [status, setStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Refs so the memoized Google callback always reads the latest mode/role/consent
  // without re-rendering (and re-mounting) the Google button on every keystroke.
  const modeRef = useRef(mode); modeRef.current = mode;
  const formRef = useRef(form); formRef.current = form;

  const updateField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleGoogleSuccess = useCallback(async (credential) => {
    const registering = modeRef.current === "register";
    setStatus(registering ? "Creating your account with Google…" : "Signing in with Google…");
    try {
      const body = { credential };
      if (registering) {
        body.role = formRef.current.role;
        body.data_consent = formRef.current.data_consent;
        body.ref = formRef.current.ref || undefined;
      }
      const result = await apiFetch("/api/auth/google", {
        method: "POST",
        body: JSON.stringify(body)
      });
      setToken(result.token);
      if (registering) clearReferral();
      window.dispatchEvent(new Event("auth-change"));
      const role = getUserRole();
      const redirectPath = backTo || homeFor(role);
      setStatus("Signed in. Redirecting…");
      setTimeout(() => navigate(redirectPath), 400);
    } catch (err) {
      setStatus(err.message);
    }
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("Loading…");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : form;
      const result = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setToken(result.token);
      if (mode === "register") clearReferral();
      window.dispatchEvent(new Event("auth-change"));
      const role = getUserRole();
      const redirectPath = backTo || homeFor(role);
      setStatus("Signed in. Redirecting…");
      setTimeout(() => navigate(redirectPath), 400);
    } catch (err) {
      setStatus(err.message);
    }
  };

  const isRegister = mode === "register";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: "0",
        maxWidth: "1080px",
        margin: "0 auto",
        background: "var(--surface)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
        minHeight: "560px"
      }}
      className="login-grid"
    >
      {/* Left: gradient panel */}
      <div
        style={{
          background: "var(--grad)",
          color: "#fff",
          padding: "3rem 2.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div>
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", fontWeight: 700, marginBottom: "1rem" }}>
            MyEduPort
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "#fff", lineHeight: 1.15, maxWidth: "16ch", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            {isRegister ? "Start the portfolio that gets you in." : "Welcome back."}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "1rem", lineHeight: 1.6, maxWidth: "32ch" }}>
            {isRegister
              ? "Track academics, design your spike, draft essays, and let AI surface what's missing."
              : "Pick up where you left off. Your portfolio, your scores, and your next steps are waiting."}
          </p>
        </div>

        <div style={{ marginTop: "3rem" }}>
          <div style={{ fontStyle: "italic", fontSize: "1rem", color: "#fff", lineHeight: 1.5, maxWidth: "36ch" }}>
            "Top universities don't just want excellent students — they want
            interesting, passionate individuals who will contribute."
          </div>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginTop: "1rem", fontWeight: 700 }}>
            — The Excellent Portfolio Guide
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div style={{ padding: "3rem 2.5rem" }}>
        <div className="eyebrow" style={{ paddingLeft: 0 }}>
          {isRegister ? "Create account" : "Sign in"}
        </div>
        <h1 className="section-title" style={{ fontSize: "1.75rem", marginBottom: "1.5rem" }}>
          {isRegister ? "Create your account" : "Sign in to MyEduPort"}
        </h1>
        {isRegister && (
          <div style={{ margin: "-0.75rem 0 1.5rem", padding: "0.7rem 0.9rem", background: "var(--success-soft)", borderLeft: "3px solid var(--success)", borderRadius: "var(--r-md)", fontSize: "0.88rem", color: "var(--ink)" }}>
            🎉 <strong>14-day free trial</strong> — every new account gets Professional features free for 14 days. No credit card needed.
          </div>
        )}

        <form onSubmit={onSubmit}>
          {isRegister && (
            <>
              <div className="input">
                <label>Name</label>
                <input value={form.name} onChange={updateField("name")} placeholder="Your full name" />
              </div>
              <div className="input">
                <label>Role</label>
                <select value={form.role} onChange={updateField("role")}>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="counselor">School Counselor</option>
                </select>
              </div>
              {form.role !== "counselor" && (
                <div className="input">
                  <label>Referral code <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                  <input value={form.ref} onChange={updateField("ref")} placeholder="From a friend or partner" autoComplete="off" />
                  {refInfo?.valid && (
                    <span style={{ fontSize: "0.8rem", color: "var(--success-deep)", marginTop: "0.3rem", display: "block" }}>
                      ✓ From {refInfo.from} — {discountText(refInfo)}
                    </span>
                  )}
                  {refInfo && !refInfo.valid && form.ref.trim().length >= 3 && (
                    <span style={{ fontSize: "0.8rem", color: "var(--error-deep)", marginTop: "0.3rem", display: "block" }}>
                      We don't recognise that code.
                    </span>
                  )}
                </div>
              )}
            </>
          )}
          <div className="input">
            <label>Email</label>
            <input type="email" value={form.email} onChange={updateField("email")} placeholder="you@email.com" />
          </div>
          <div className="input">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={updateField("password")}
                placeholder={showPassword ? "your password" : "••••••••"}
                style={{ width: "100%", paddingRight: "3.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "0.5rem",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "0.35rem 0.65rem"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {!isRegister && (
            <div style={{ textAlign: "right", marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
              <Link to="/reset" style={{ color: "var(--teal-deep)", fontSize: "0.82rem", textDecoration: "underline" }}>
                Forgot password?
              </Link>
            </div>
          )}

          {isRegister && (
            <label
              style={{
                display: "flex",
                alignItems: "start",
                gap: "0.6rem",
                cursor: "pointer",
                fontSize: "0.85rem",
                lineHeight: 1.55,
                marginBottom: "1.25rem",
                color: "var(--ink-muted)"
              }}
            >
              <input
                type="checkbox"
                checked={form.data_consent}
                onChange={(e) => setForm((prev) => ({ ...prev, data_consent: e.target.checked }))}
                style={{ marginTop: "0.25rem", cursor: "pointer", accentColor: "var(--teal)" }}
                required
              />
              <span>
                I consent to processing of my data for personalized guidance and AI improvement, as described in the{" "}
                <Link to="/privacy" style={{ color: "var(--teal-deep)", textDecoration: "underline" }}>
                  Privacy Policy
                </Link>.
              </span>
            </label>
          )}

          <button
            className="button"
            type="submit"
            style={{ width: "100%" }}
            disabled={isRegister && !form.data_consent}
          >
            {isRegister ? "Create account" : "Sign in"}
          </button>

          {GOOGLE_CLIENT_ID && (
            <>
              <GoogleSignIn
                onSuccess={handleGoogleSuccess}
                disabled={!!status || (isRegister && !form.data_consent)}
              />
              {isRegister && !form.data_consent && (
                <p className="muted" style={{ fontSize: "0.78rem", textAlign: "center", marginTop: "0.5rem" }}>
                  Accept the Privacy Policy above to continue with Google.
                </p>
              )}
              {isRegister && (
                <p className="muted" style={{ fontSize: "0.78rem", textAlign: "center", marginTop: "0.5rem" }}>
                  You'll sign up as <strong style={{ textTransform: "capitalize" }}>{form.role}</strong>. Change the role above first if needed.
                </p>
              )}
            </>
          )}
        </form>

        {status && (
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.85rem",
              color: status.includes("Redirect") || status.includes("Signed") ? "var(--success)" : "var(--ink-muted)"
            }}
          >
            {status}
          </p>
        )}

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--rule)",
            fontSize: "0.88rem",
            color: "var(--ink-muted)"
          }}
        >
          {isRegister ? "Already have an account?" : "New to MyEduPort?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isRegister ? "login" : "register")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--teal-deep)",
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "inherit",
              fontSize: "inherit",
              textDecoration: "underline",
              padding: 0
            }}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
