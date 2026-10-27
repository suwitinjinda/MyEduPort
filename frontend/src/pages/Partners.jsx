import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiFetch, setToken, getToken, getUserRole } from "../api/client";

// Public page for tutors, schools and education creators to apply as partners.
// Applying creates a partner account in "pending"; an admin then approves it and sets the
// partner's code and terms. Specific commission rates are agreed per partner, so nothing
// here promises a number.

const STEPS = [
  { title: "Apply", text: "Tell us who you work with. It takes two minutes." },
  { title: "Get your code", text: "Once approved you get a personal link and code, and your terms." },
  { title: "Share and earn", text: "Students who join through you get a discount. You earn when they subscribe." }
];

export default function Partners() {
  const navigate = useNavigate();
  const signedIn = Boolean(getToken());
  const role = getUserRole();
  const [form, setForm] = useState({ name: "", email: "", password: "", organisation: "", phone: "", website: "", audience: "", is_adult: false, data_consent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (signedIn && role === "affiliate") return <Navigate to="/affiliate" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.organisation.trim()) return setError("Fill in your name, email and organisation.");
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
    if (!form.is_adult) return setError("Partners must be 18 or older.");
    if (!form.data_consent) return setError("Accept the Privacy Policy to continue.");
    setBusy(true);
    try {
      const r = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ ...form, role: "affiliate" }) });
      setToken(r.token);
      window.dispatchEvent(new Event("auth-change"));
      navigate("/affiliate");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.75rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Partner program</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.3rem", color: "var(--ink)", letterSpacing: "-0.02em", marginTop: "0.4rem" }}>
          Partner with MyEduPort
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "62ch" }}>
          For tutors, schools, counsellors and education creators. Share MyEduPort with the students
          you already help — they get a discount, and you earn a commission when they subscribe.
        </p>
      </header>

      <div className="grid three" style={{ marginBottom: "2.25rem" }}>
        {STEPS.map((s, i) => (
          <div key={s.title} className="card compact">
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700 }}>Step {i + 1}</div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0.3rem 0" }}>{s.title}</div>
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{s.text}</p>
          </div>
        ))}
      </div>

      {signedIn ? (
        <section className="card" style={{ maxWidth: "640px" }}>
          <h2 className="section-title" style={{ fontSize: "1.2rem" }}>You're signed in as a {role}</h2>
          <p className="muted" style={{ fontSize: "0.92rem" }}>
            Partner accounts are separate from student and parent accounts. Sign out, then apply with a
            different email address.
          </p>
        </section>
      ) : (
        <section className="card" style={{ maxWidth: "640px" }}>
          <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Apply to become a partner</h2>
          <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.9rem" }}>
            <div className="grid two" style={{ gap: "0.9rem" }}>
              <label className="input"><span>Your name</span><input value={form.name} onChange={set("name")} autoComplete="name" /></label>
              <label className="input"><span>Organisation</span><input value={form.organisation} onChange={set("organisation")} placeholder="Tutoring centre, school, channel…" /></label>
              <label className="input"><span>Email</span><input type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
              <label className="input"><span>Phone</span><input value={form.phone} onChange={set("phone")} autoComplete="tel" /></label>
            </div>
            <label className="input"><span>Website or social page <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></span><input value={form.website} onChange={set("website")} placeholder="https://" /></label>
            <label className="input"><span>Who would you share MyEduPort with?</span><textarea rows={3} value={form.audience} onChange={set("audience")} placeholder="e.g. about 120 Grade 10–12 students preparing for US and UK universities" /></label>
            <label className="input"><span>Password</span><input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" /></label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.88rem" }}>
              <input type="checkbox" checked={form.is_adult} onChange={set("is_adult")} style={{ marginTop: "0.2rem" }} />
              <span>I'm 18 or older.</span>
            </label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.88rem" }}>
              <input type="checkbox" checked={form.data_consent} onChange={set("data_consent")} style={{ marginTop: "0.2rem" }} />
              <span>I agree to the <Link to="/privacy" style={{ color: "var(--teal-deep)" }}>Privacy Policy</Link>.</span>
            </label>
            {error && <p style={{ margin: 0, color: "var(--error-deep)", fontSize: "0.88rem" }}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <button className="button" type="submit" disabled={busy}>{busy ? "Sending…" : "Apply"}</button>
              <span className="text-muted" style={{ fontSize: "0.85rem" }}>Already a partner? <Link to="/login" style={{ color: "var(--teal-deep)" }}>Sign in</Link></span>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
