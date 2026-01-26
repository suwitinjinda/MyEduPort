import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, setToken, getUserRole } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    data_consent: false
  });
  const [status, setStatus] = useState("");

  const updateField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("Loading...");
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
      window.dispatchEvent(new Event("auth-change"));
      const role = getUserRole();
      const redirectPath = role === "parent" ? "/parent" : "/";
      setStatus(`Signed in. Redirecting to ${role === "parent" ? "Parent Dashboard" : "Home"}...`);
      setTimeout(() => navigate(redirectPath), 400);
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <div className="grid two">
      <div className="card">
        <div className="section-title">{mode === "login" ? "Sign In" : "Create Account"}</div>
        <form onSubmit={onSubmit}>
          {mode === "register" && (
            <>
              <div className="input">
                <label>Name</label>
                <input value={form.name} onChange={updateField("name")} placeholder="Your name" />
              </div>
              <div className="input">
                <label>Role</label>
                <select value={form.role} onChange={updateField("role")}>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
            </>
          )}
          <div className="input">
            <label>Email</label>
            <input type="email" value={form.email} onChange={updateField("email")} placeholder="you@email.com" />
          </div>
          <div className="input">
            <label>Password</label>
            <input type="password" value={form.password} onChange={updateField("password")} placeholder="••••••••" />
          </div>
          {mode === "register" && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "start", gap: "0.75rem", cursor: "pointer", fontSize: "0.875rem" }}>
                <input
                  type="checkbox"
                  checked={form.data_consent}
                  onChange={(e) => setForm(prev => ({ ...prev, data_consent: e.target.checked }))}
                  style={{ marginTop: "0.25rem", cursor: "pointer" }}
                  required
                />
                <span>
                  I consent to the processing of my data for personalized guidance and AI model improvement, as described in the{" "}
                  <Link to="/privacy" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                    Privacy Policy
                  </Link>
                  . <span style={{ color: "var(--error)" }}>*</span>
                </span>
              </label>
            </div>
          )}
          <button className="button" type="submit" disabled={mode === "register" && !form.data_consent}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
        {status && <p className="muted" style={{ marginTop: "12px" }}>{status}</p>}
      </div>
      <div className="card">
        <div className="section-title">New to MyEduPort?</div>
        <p className="muted">
          Create your account to start building a portfolio and unlock AI guidance.
        </p>
        <button className="button ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Switch to Register" : "Switch to Login"}
        </button>
      </div>
    </div>
  );
}
