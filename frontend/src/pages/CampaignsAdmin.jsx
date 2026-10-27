import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";
import { BASE } from "./landing/campaigns.jsx";

// Admin → Campaigns: create the /lp/<link-name> landing pages used in ads, change their
// wording, pause them, and build the link to post. A field left blank shows the standard
// landing-page wording (shown greyed in the box), so a campaign can be just a headline.

const GROUPS = [
  { title: "Top of the page", fields: [
    { key: "badge", label: "Small badge above the headline" },
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Text under the headline", long: true, hint: "Put **double stars** around words to make them bold." },
    { key: "trialNote", label: "Free-trial note" },
    { key: "ctaPrimary", label: "Main button" },
    { key: "ctaSecondary", label: "Second button" }
  ] },
  { title: "Video card on the picture", fields: [
    { key: "previewEyebrow", label: "Small label" },
    { key: "previewTitle", label: "Card title" }
  ] },
  { title: "Bottom of the page", fields: [
    { key: "closingHeadline", label: "Closing headline" },
    { key: "closingSubtext", label: "Closing text", long: true },
    { key: "closingCta", label: "Closing button" }
  ] },
  { title: "Facebook / LINE link preview and browser tab", fields: [
    { key: "title", label: "Page title" },
    { key: "description", label: "Description", long: true }
  ] }
];

// Where the link will be posted. Added as utm_source so ad and analytics tools can tell
// the same campaign's traffic apart by channel.
const SOURCES = [
  { v: "", label: "Not tagged" },
  { v: "facebook", label: "Facebook" },
  { v: "instagram", label: "Instagram" },
  { v: "tiktok", label: "TikTok" },
  { v: "line", label: "LINE" },
  { v: "google", label: "Google" },
  { v: "youtube", label: "YouTube" },
  { v: "email", label: "Email" }
];

const BLANK = { name: "", slug: "", status: "active", content: {} };
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
const toSlug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const placeholderFor = (key) => (typeof BASE[key] === "string" ? BASE[key] : key === "subheadline" ? "Build a world-class portfolio. Get into top universities in the **US · UK · China**." : "");

const linkBox = { flex: 1, minWidth: 0, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem", padding: "0.6rem 0.8rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface-warm, #f8fafc)", color: "var(--ink)" };
const small = { fontSize: "0.75rem", padding: "0.3rem 0.7rem" };

function LinkBuilder({ slug, onClose }) {
  const [source, setSource] = useState("facebook");
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState(false);

  const params = new URLSearchParams();
  if (ref.trim()) params.set("ref", ref.trim().toUpperCase());
  if (source) { params.set("utm_source", source); params.set("utm_campaign", slug); }
  const qs = params.toString();
  const link = `${window.location.origin}/lp/${slug}${qs ? `?${qs}` : ""}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* select manually */ }
  };

  return (
    <div style={{ marginTop: "0.9rem", paddingTop: "0.9rem", borderTop: "1px solid var(--rule-soft)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <label className="input">
          <span>Where will you post it?</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
        <label className="input">
          <span>Partner code <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></span>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. KRUPOOM — gives their discount and credit" />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Campaign link" style={linkBox} />
        <button className="button" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
        <button className="button ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function CampaignsAdmin() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [linkFor, setLinkFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });

  const load = () => apiFetch("/api/admin/campaigns").then((d) => setRows(d.campaigns)).catch((e) => setMsg({ text: e.message, error: true }));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(BLANK); setEditingId(null); setSlugTouched(false); setMsg({ text: "", error: false }); };
  const openEdit = (c) => { setForm({ name: c.name, slug: c.slug, status: c.status, content: { ...c.content } }); setEditingId(c.id); setSlugTouched(true); setMsg({ text: "", error: false }); };

  const setName = (e) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : toSlug(name) }));
  };
  const setSlug = (e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })); };
  const setField = (k) => (e) => setForm((f) => ({ ...f, content: { ...f.content, [k]: e.target.value } }));

  const slugOk = SLUG_RE.test(form?.slug || "");

  const save = async () => {
    setBusy(true); setMsg({ text: "", error: false });
    try {
      const r = await apiFetch(editingId ? `/api/admin/campaigns/${editingId}` : "/api/admin/campaigns", {
        method: editingId ? "PUT" : "POST", body: JSON.stringify(form)
      });
      const slug = form.slug;
      setForm(null); setEditingId(null);
      await load();
      setMsg({ text: editingId ? "Saved — the page shows the new wording now." : `Campaign created: /lp/${slug} is live.`, error: false });
      if (!editingId && r?.slug) setLinkFor(r.slug);
    } catch (e) {
      setMsg({ text: e.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c) => {
    try {
      await apiFetch(`/api/admin/campaigns/${c.id}`, { method: "PUT", body: JSON.stringify({ status: c.status === "active" ? "paused" : "active" }) });
      load();
    } catch (e) { setMsg({ text: e.message, error: true }); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete the campaign "${c.name}"? /lp/${c.slug} will show the standard landing page, and its visit counts are lost.`)) return;
    try { await apiFetch(`/api/admin/campaigns/${c.id}`, { method: "DELETE" }); load(); }
    catch (e) { setMsg({ text: e.message, error: true }); }
  };

  return (
    <div>
      <p className="muted" style={{ fontSize: "0.9rem", marginTop: 0, maxWidth: "70ch" }}>
        Each campaign is a landing page at <strong>/lp/&lt;link name&gt;</strong> for your ads, with no site menu — just the pitch and a sign-up button.
        Write only what should differ; blank boxes show the standard wording. Paused or deleted campaigns show the standard page, so old ad links never break.
      </p>

      {msg.text && (
        <div className="card compact" style={{ marginBottom: "1rem", background: msg.error ? "var(--error-soft)" : "var(--success-soft)", color: msg.error ? "var(--error-deep)" : "var(--ink)" }}>
          {msg.text}
        </div>
      )}

      {!form && <button className="button" style={{ marginBottom: "1.25rem" }} onClick={openNew}>+ New campaign</button>}

      {form && (
        <section className="card" style={{ marginBottom: "1.5rem" }}>
          <h3 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{editingId ? `Edit "${form.name}"` : "New campaign"}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <label className="input">
              <span>Campaign name <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(only you see this)</span></span>
              <input value={form.name} onChange={setName} placeholder="Facebook — parents, October" />
            </label>
            <label className="input">
              <span>Link name</span>
              <input value={form.slug} onChange={setSlug} placeholder="facebook-parents-oct" aria-invalid={!!form.slug && !slugOk} />
            </label>
            <label className="input">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Live</option>
                <option value="paused">Paused</option>
              </select>
            </label>
          </div>
          <p style={{ fontSize: "0.82rem", margin: "0.5rem 0 0", color: form.slug && !slugOk ? "var(--error-deep)" : "var(--ink-muted)" }}>
            {form.slug && !slugOk
              ? "Link name: lowercase English letters, numbers and dashes only."
              : <>Page address: <strong>{window.location.origin}/lp/{form.slug || "…"}</strong>{editingId && " — changing it breaks links already posted."}</>}
          </p>

          {GROUPS.map((g) => (
            <div key={g.title} style={{ marginTop: "1.5rem" }}>
              <div className="eyebrow" style={{ marginBottom: "0.6rem" }}>{g.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                {g.fields.map((f) => (
                  <label key={f.key} className="input" style={f.long ? { gridColumn: "1 / -1" } : undefined}>
                    <span>{f.label}</span>
                    {f.long
                      ? <textarea rows={2} value={form.content[f.key] || ""} onChange={setField(f.key)} placeholder={placeholderFor(f.key)} />
                      : <input value={form.content[f.key] || ""} onChange={setField(f.key)} placeholder={placeholderFor(f.key)} />}
                    {f.hint && <small className="text-muted" style={{ fontSize: "0.75rem" }}>{f.hint}</small>}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
            <button className="button" disabled={busy || !form.name.trim() || !slugOk} onClick={save}>{busy ? "Saving…" : editingId ? "Save changes" : "Create campaign"}</button>
            <button className="button ghost" disabled={busy} onClick={() => { setForm(null); setEditingId(null); }}>Cancel</button>
          </div>
        </section>
      )}

      {rows === null ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="muted" style={{ margin: 0 }}>No campaigns yet. Create one to get a landing page link for your ads.</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: "0.85rem" }}>
          {rows.map((c) => (
            <article key={c.id} className="card compact">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{c.name}</strong>
                    <span className="badge" style={c.status === "active"
                      ? { background: "var(--success-soft)", color: "var(--success-deep)", border: "1px solid var(--success-deep)" }
                      : { background: "#fef3c7", color: "#92400e", border: "1px solid #b45309" }}>
                      {c.status === "active" ? "Live" : "Paused"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: "0.25rem", overflowWrap: "anywhere" }}>/lp/{c.slug}</div>
                  <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.3rem" }}>
                    {c.visits_30d.toLocaleString()} visitors in 30 days · {c.visits.toLocaleString()} all time · created {fmtDate(c.created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button className="button" style={small} onClick={() => setLinkFor(linkFor === c.slug ? null : c.slug)}>Get link</button>
                  <a className="button ghost" style={small} href={`/lp/${c.slug}`} target="_blank" rel="noopener noreferrer">Open page</a>
                  <button className="button ghost" style={small} onClick={() => openEdit(c)}>Edit</button>
                  <button className="button ghost" style={small} onClick={() => toggle(c)}>{c.status === "active" ? "Pause" : "Go live"}</button>
                  <button className="button ghost" style={small} onClick={() => remove(c)}>Delete</button>
                </div>
              </div>
              {linkFor === c.slug && <LinkBuilder slug={c.slug} onClose={() => setLinkFor(null)} />}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
