import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, apiUpload } from "../api/client";
import { fmtDate, fmtDateTime } from "../utils/date.js";

// Admin → Email Marketing: campaigns (AI draft, HTML editor, audience, test/send/schedule),
// saved groups, and the unsubscribe list. Backend: /api/admin/email/*
const API = "/api/admin/email";

const STATUS_STYLE = {
  draft: { bg: "var(--rule-soft)", fg: "var(--ink-muted)" },
  scheduled: { bg: "rgba(59,130,246,0.12)", fg: "#2563eb" },
  sending: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  sent: { bg: "var(--success-soft)", fg: "var(--success)" },
  failed: { bg: "var(--error-soft)", fg: "var(--error)" },
  cancelled: { bg: "var(--rule-soft)", fg: "var(--ink-faint)" }
};
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const fmt = (d) => (d ? fmtDateTime(d) : "—");
const small = { padding: "0.35rem 0.8rem", fontSize: "0.75rem" };

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.15rem 0.55rem", borderRadius: "var(--r-full)", background: s.bg, color: s.fg }}>
      {status}
    </span>
  );
}

export default function EmailMarketing() {
  const [view, setView] = useState("campaigns"); // campaigns | groups | unsubscribes
  const [editingId, setEditingId] = useState(null); // campaign id or "new"
  const [mailStatus, setMailStatus] = useState(null);

  useEffect(() => { apiFetch(`${API}/status`).then(setMailStatus).catch(() => {}); }, []);

  return (
    <div>
      {mailStatus && !mailStatus.configured && (
        <div style={{ padding: "0.85rem 1.1rem", marginBottom: "1.25rem", background: "var(--warn-soft)", borderLeft: "3px solid var(--warn)", borderRadius: "var(--r-md)", fontSize: "0.88rem" }}>
          <strong>Sending isn't connected yet.</strong> You can draft, build audiences and schedule, but test and real sends need SMTP settings
          (<code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>MAIL_FROM</code>) in <code>backend/.env</code>.
        </div>
      )}
      {mailStatus?.configured && (
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>Sending from <strong>{mailStatus.from}</strong></p>
      )}

      {!editingId && (
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[["campaigns", "Campaigns"], ["audience", "Audience"], ["groups", "Groups"], ["unsubscribes", "Unsubscribes"]].map(([k, l]) => (
            <button key={k} type="button" className={view === k ? "button" : "button ghost"} style={small} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
      )}

      {editingId ? (
        <CampaignEditor id={editingId} segments={mailStatus?.segments || []} configured={!!mailStatus?.configured} onClose={() => setEditingId(null)} onOpen={setEditingId} />
      ) : view === "campaigns" ? (
        <CampaignList onOpen={setEditingId} />
      ) : view === "audience" ? (
        <AudienceManager />
      ) : view === "groups" ? (
        <GroupsManager />
      ) : (
        <Unsubscribes />
      )}
    </div>
  );
}

// ---------------- Campaign list ----------------
function CampaignList({ onOpen }) {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => apiFetch(`${API}/campaigns`).then(setRows).catch((e) => setMsg(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // live progress while sending
    return () => clearInterval(t);
  }, []);

  const act = async (fn) => { setMsg(""); try { await fn(); load(); } catch (e) { setMsg(e.message); } };

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.2rem" }}>Email campaigns</h2>
          <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Draft with AI, pick an audience, then test, send now or schedule.</p>
        </div>
        <button type="button" className="button" onClick={() => onOpen("new")}>+ New campaign</button>
      </div>
      {msg && <p style={{ color: "var(--error)", fontSize: "0.85rem" }}>{msg}</p>}
      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? (
        <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>No campaigns yet. Create one to get started.</p>
      ) : (
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "760px" }}>
            <thead>
              <tr><th style={{ textAlign: "left" }}>Campaign</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Opened</th><th>Clicked</th><th style={{ textAlign: "left" }}>When</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button type="button" onClick={() => onOpen(c.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600, color: "var(--ink)", textAlign: "left", fontFamily: "inherit" }}>{c.name}</button>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>{c.subject || "(no subject)"}</div>
                  </td>
                  <td style={{ textAlign: "center" }}><StatusBadge status={c.status} /></td>
                  <td style={{ textAlign: "center" }}>{c.total || "—"}</td>
                  <td style={{ textAlign: "center" }}>{c.sent_count}{c.failed_count ? <span style={{ color: "var(--error)" }}> · {c.failed_count} failed</span> : null}</td>
                  <td style={{ textAlign: "center" }}>{pct(c.opened, c.sent_count)}</td>
                  <td style={{ textAlign: "center" }}>{pct(c.clicked, c.sent_count)}</td>
                  <td style={{ fontSize: "0.8rem" }}>{c.status === "scheduled" ? `Scheduled ${fmt(c.scheduled_at)}` : c.sent_at ? fmt(c.sent_at) : `Edited ${fmt(c.updated_at)}`}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button type="button" className="button ghost" style={{ ...small, marginRight: "0.3rem" }} onClick={() => onOpen(c.id)}>{["sent", "sending"].includes(c.status) ? "Report" : "Edit"}</button>
                    <button type="button" className="button ghost" style={{ ...small, marginRight: "0.3rem" }} onClick={() => act(async () => { const r = await apiFetch(`${API}/campaigns/${c.id}/duplicate`, { method: "POST" }); onOpen(r.id); })}>Duplicate</button>
                    {["scheduled", "sending"].includes(c.status) ? (
                      <button type="button" className="button ghost" style={{ ...small, color: "var(--error)" }} onClick={() => window.confirm("Cancel this send? Emails already sent can't be recalled.") && act(() => apiFetch(`${API}/campaigns/${c.id}/cancel`, { method: "POST" }))}>Cancel</button>
                    ) : (
                      <button type="button" className="button ghost" style={{ ...small, color: "var(--error)" }} onClick={() => window.confirm(`Delete "${c.name}"?`) && act(() => apiFetch(`${API}/campaigns/${c.id}`, { method: "DELETE" }))}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------- Campaign editor ----------------
const EMPTY = { name: "", subject: "", preheader: "", html: "", audience: { segments: ["free_students"], segmentIds: [], groupIds: [], userIds: [], external: "" } };

function CampaignEditor({ id, segments, configured, onClose, onOpen }) {
  const [c, setC] = useState(id === "new" ? EMPTY : null);
  const [status, setStatus] = useState("draft");
  const [report, setReport] = useState(null);
  const [msg, setMsg] = useState({ text: "", error: false });
  const [busy, setBusy] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [testTo, setTestTo] = useState("");
  const [dirty, setDirty] = useState(id === "new");
  const [editorKey, setEditorKey] = useState(0); // remount the editor when content is replaced (AI draft / load)

  const load = async (cid) => {
    const d = await apiFetch(`${API}/campaigns/${cid}`);
    const aud = d.audience || {};
    setC({
      name: d.name, subject: d.subject, preheader: d.preheader, html: d.html || "",
      audience: {
        segments: aud.segments || [], segmentIds: aud.segmentIds || [], groupIds: aud.groupIds || [], userIds: aud.userIds || [],
        external: (aud.external || []).map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join("\n")
      }
    });
    setStatus(d.status);
    setReport(d);
    setEditorKey((k) => k + 1);
    setDirty(false);
  };
  useEffect(() => { if (id !== "new") load(id).catch((e) => setMsg({ text: e.message, error: true })); }, [id]);

  const readOnly = ["sent", "sending"].includes(status);
  const set = (patch) => { setC((p) => ({ ...p, ...patch })); setDirty(true); };
  const setAud = (patch) => { setC((p) => ({ ...p, audience: { ...p.audience, ...patch } })); setDirty(true); };
  const say = (text, error = false) => setMsg({ text, error });

  // Save and return the campaign id (creates it on first save)
  const save = async () => {
    const body = JSON.stringify({ ...c, name: c.name || c.subject || "Untitled campaign" });
    if (id === "new") {
      const r = await apiFetch(`${API}/campaigns`, { method: "POST", body });
      setDirty(false);
      onOpen(r.id);
      return r.id;
    }
    await apiFetch(`${API}/campaigns/${id}`, { method: "PUT", body });
    setDirty(false);
    return id;
  };
  const run = async (label, fn) => {
    setBusy(label); say("");
    try { await fn(); } catch (e) { say(e.message, true); } finally { setBusy(""); }
  };

  if (!c) return <div className="card"><p className="muted">Loading…</p></div>;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" className="button ghost" style={small} onClick={() => (!dirty || window.confirm("Leave without saving?")) && onClose()}>← All campaigns</button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <StatusBadge status={status} />
          {!readOnly && <button type="button" className="button ghost" style={small} disabled={!!busy} onClick={() => run("save", async () => { await save(); say("Saved."); })}>{busy === "save" ? "Saving…" : dirty ? "Save draft" : "Saved"}</button>}
        </div>
      </div>
      {msg.text && <div style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--r-md)", fontSize: "0.88rem", background: msg.error ? "var(--error-soft)" : "var(--success-soft)", color: msg.error ? "var(--error)" : "var(--ink)" }}>{msg.text}</div>}

      {readOnly && report && <CampaignReport campaign={report} onRefresh={() => load(id)} />}

      {/* 1. Details */}
      <section className="card">
        <h3 className="subtitle" style={{ marginBottom: "0.75rem" }}>1 · Details</h3>
        <div className="grid two">
          <div className="input"><label>Campaign name (internal)</label><input value={c.name} disabled={readOnly} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Free → Essential, October" /></div>
          <div className="input"><label>Subject line</label><input value={c.subject} disabled={readOnly} maxLength={255} onChange={(e) => set({ subject: e.target.value })} placeholder="{{first_name}}, see your real admission chances" /></div>
        </div>
        <div className="input">
          <label>Preheader <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(preview text shown after the subject in the inbox)</span></label>
          <input value={c.preheader} disabled={readOnly} maxLength={255} onChange={(e) => set({ preheader: e.target.value })} />
        </div>
        <p className="text-muted" style={{ fontSize: "0.78rem", margin: 0 }}>Merge tags: {"{{first_name}} {{name}} {{email}} {{plan}}"} — replaced for each recipient.</p>
      </section>

      {/* 2. Content */}
      <section className="card">
        <h3 className="subtitle" style={{ marginBottom: "0.75rem" }}>2 · Content</h3>
        {!readOnly && (
          <AiDraftPanel onDraft={(d) => { set({ subject: d.subject || c.subject, preheader: d.preheader || c.preheader, html: d.html }); setEditorKey((k) => k + 1); say(d.note || "AI draft ready — review and edit before sending."); }} hasContent={!!c.html.trim()} />
        )}
        <EmailHtmlEditor key={editorKey} value={c.html} readOnly={readOnly} onChange={(html) => set({ html })} preheader={c.preheader} />
      </section>

      {/* 3. Audience */}
      <section className="card">
        <h3 className="subtitle" style={{ marginBottom: "0.75rem" }}>3 · Audience</h3>
        <AudienceBuilder audience={c.audience} segments={segments} readOnly={readOnly} onChange={setAud} />
      </section>

      {/* 4. Test & send */}
      {!readOnly && (
        <section className="card">
          <h3 className="subtitle" style={{ marginBottom: "0.75rem" }}>4 · Test &amp; send</h3>
          {!configured && <p style={{ fontSize: "0.85rem", color: "var(--warn)" }}>Sending is disabled until SMTP is configured.</p>}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1rem" }}>
            <div className="input" style={{ marginBottom: 0, flex: "1 1 240px" }}>
              <label>Send a test to</label>
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Your admin email (leave blank)" />
            </div>
            <button type="button" className="button ghost" disabled={!configured || !!busy} onClick={() => run("test", async () => {
              const cid = await save();
              const r = await apiFetch(`${API}/campaigns/${cid}/test`, { method: "POST", body: JSON.stringify({ to: testTo || undefined }) });
              say(`Test sent to ${r.to}.`);
            })}>{busy === "test" ? "Sending…" : "Send test"}</button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
            <button type="button" className="button" disabled={!configured || !!busy} onClick={() => run("send", async () => {
              const cid = await save();
              const prev = await apiFetch(`${API}/audience/preview`, { method: "POST", body: JSON.stringify({ audience: c.audience }) });
              if (!window.confirm(`Send "${c.subject}" to ${prev.count} recipient${prev.count === 1 ? "" : "s"} now?`)) return;
              const r = await apiFetch(`${API}/campaigns/${cid}/send`, { method: "POST", body: JSON.stringify({}) });
              say(`Sending to ${r.recipients} recipients… progress updates in the report.`);
              await load(cid);
            })}>{busy === "send" ? "Starting…" : "Send now"}</button>
            <span className="muted" style={{ padding: "0 0.25rem 0.6rem" }}>or</span>
            <div className="input" style={{ marginBottom: 0 }}>
              <label>Schedule for</label>
              <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </div>
            <button type="button" className="button ghost" disabled={!configured || !scheduleAt || !!busy} onClick={() => run("schedule", async () => {
              const when = new Date(scheduleAt);
              if (when.getTime() < Date.now() + 60 * 1000) throw new Error("Pick a time at least a minute from now.");
              const cid = await save();
              const r = await apiFetch(`${API}/campaigns/${cid}/send`, { method: "POST", body: JSON.stringify({ scheduled_at: when.toISOString() }) });
              setStatus(r.status);
              say(`Scheduled for ${fmtDateTime(when)} — ${r.recipients} recipients (audience is re-checked at send time).`);
            })}>{busy === "schedule" ? "Scheduling…" : status === "scheduled" ? "Reschedule" : "Schedule"}</button>
            {status === "scheduled" && (
              <button type="button" className="button ghost" style={{ color: "var(--error)" }} onClick={() => run("cancel", async () => {
                await apiFetch(`${API}/campaigns/${id}/cancel`, { method: "POST" });
                setStatus("cancelled");
                say("Schedule cancelled — the campaign is back to editable.");
              })}>Cancel schedule</button>
            )}
          </div>
          {report?.scheduled_at && status === "scheduled" && <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.75rem" }}>Currently scheduled for {fmt(report.scheduled_at)}.</p>}
        </section>
      )}
    </div>
  );
}

function CampaignReport({ campaign: c, onRefresh }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    apiFetch(`${API}/campaigns/${c.id}/recipients`).then(setRows).catch(() => {});
    if (c.status !== "sending") return undefined;
    const t = setInterval(onRefresh, 8000);
    return () => clearInterval(t);
  }, [c.id, c.status, c.sent_count]);
  const s = c.stats || {};
  const tiles = [
    ["Recipients", c.total],
    ["Sent", c.sent_count],
    ["Failed", c.failed_count],
    ["Opened", `${s.opened || 0} · ${pct(s.opened, c.sent_count)}`],
    ["Clicked", `${s.clicked || 0} · ${pct(s.clicked, c.sent_count)}`]
  ];
  return (
    <section className="card">
      <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
        <h3 className="subtitle" style={{ marginBottom: 0 }}>Report</h3>
        <button type="button" className="button ghost" style={small} onClick={onRefresh}>Refresh</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        {tiles.map(([k, v]) => (
          <div key={k} style={{ padding: "0.75rem 1rem", background: "var(--paper-warm)", borderRadius: "var(--r-md)" }}>
            <div className="muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--navy)" }}>{v}</div>
          </div>
        ))}
      </div>
      {c.last_error && <p style={{ fontSize: "0.82rem", color: "var(--error)" }}>Last error: {c.last_error}</p>}
      <p className="muted" style={{ fontSize: "0.78rem" }}>Opens are approximate — some mail apps block tracking images or pre-load them.</p>
      {rows && (
        <div style={{ overflowX: "auto", maxHeight: "360px", overflowY: "auto" }}>
          <table style={{ width: "100%", minWidth: "600px", fontSize: "0.82rem" }}>
            <thead><tr><th style={{ textAlign: "left" }}>Email</th><th>Status</th><th>Sent</th><th>Opened</th><th>Clicked</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email}>
                  <td>{r.name ? `${r.name} · ` : ""}{r.email}{r.error && <div style={{ color: "var(--error)", fontSize: "0.72rem" }}>{r.error}</div>}</td>
                  <td style={{ textAlign: "center" }}>{r.status}</td>
                  <td style={{ textAlign: "center" }}>{r.sent_at ? "✓" : "—"}</td>
                  <td style={{ textAlign: "center" }}>{r.opened_at ? "✓" : "—"}</td>
                  <td style={{ textAlign: "center" }}>{r.clicked_at ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------- AI draft ----------------
const GOALS = [
  ["upgrade", "Upgrade Free → paid (Essential / Professional)"],
  ["welcome", "Welcome new sign-ups & get them started"],
  ["reengage", "Re-engage inactive users"],
  ["feature", "Announce a new feature"],
  ["custom", "Custom goal…"]
];
const GOAL_TEXT = {
  upgrade: "Convert Free-plan users into paid subscribers (Essential or Professional) by showing what they're missing.",
  welcome: "Welcome new users and get them to complete their profile and first portfolio section.",
  reengage: "Bring back users who haven't logged in recently and show them what's new and useful.",
  feature: "Announce a new feature and get users to try it."
};

function AiDraftPanel({ onDraft, hasContent }) {
  const [open, setOpen] = useState(!hasContent);
  const [f, setF] = useState({ goal: "upgrade", customGoal: "", language: "en", tone: "warm, encouraging, credible", offer: "", audience: "Free-plan students", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (hasContent && !window.confirm("Replace the current content with a new AI draft?")) return;
    setBusy(true); setErr("");
    try {
      const d = await apiFetch(`${API}/ai-draft`, {
        method: "POST",
        body: JSON.stringify({ goal: f.goal === "custom" ? f.customGoal : GOAL_TEXT[f.goal], language: f.language, tone: f.tone, offer: f.offer, audience: f.audience, notes: f.notes })
      });
      onDraft(d);
      setOpen(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div style={{ marginBottom: "1rem", border: "1px solid var(--rule)", borderLeft: "3px solid var(--gold-deep)", borderRadius: "var(--r-md)", background: "var(--paper-warm)" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, color: "var(--ink)" }}>
        <span>✨ Draft with AI</span><span className="muted" style={{ fontSize: "0.8rem" }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 1rem 1rem" }}>
          <div className="grid two">
            <div className="input">
              <label>Goal</label>
              <select value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })}>{GOALS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
            <div className="input">
              <label>Language</label>
              <select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="en">English</option><option value="th">ไทย (Thai)</option></select>
            </div>
          </div>
          {f.goal === "custom" && <div className="input"><label>Your goal</label><input value={f.customGoal} onChange={(e) => setF({ ...f, customGoal: e.target.value })} /></div>}
          <div className="grid two">
            <div className="input"><label>Audience</label><input value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} /></div>
            <div className="input"><label>Tone</label><input value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })} /></div>
          </div>
          <div className="grid two">
            <div className="input"><label>Offer / promotion (optional)</label><input value={f.offer} onChange={(e) => setF({ ...f, offer: e.target.value })} placeholder="e.g. 20% off annual plans until Oct 31" /></div>
            <div className="input"><label>Extra notes (optional)</label><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. mention application deadlines" /></div>
          </div>
          {err && <p style={{ color: "var(--error)", fontSize: "0.85rem" }}>{err}</p>}
          <button type="button" className="button gold" disabled={busy} onClick={go}>{busy ? "Writing… (~15s)" : "Generate draft"}</button>
        </div>
      )}
    </div>
  );
}

// ---------------- HTML editor ----------------
function ToolBtn({ title, onClick, children, active }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection in the editor
      onClick={onClick}
      style={{ minWidth: 30, height: 30, padding: "0 0.45rem", border: "1px solid var(--rule)", borderRadius: 6, background: active ? "var(--rule-soft)" : "var(--surface)", cursor: "pointer", fontSize: "0.82rem", color: "var(--ink)", fontFamily: "inherit" }}
    >
      {children}
    </button>
  );
}

function EmailHtmlEditor({ value, onChange, readOnly, preheader }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState("visual"); // visual | html | preview
  const [uploading, setUploading] = useState(false);
  const savedRange = useRef(null);

  useEffect(() => { if (ref.current && mode === "visual") ref.current.innerHTML = value || ""; }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = () => ref.current && onChange(ref.current.innerHTML);
  const saveSel = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0);
  };
  const restoreSel = () => {
    ref.current?.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };
  const cmd = (name, arg) => {
    restoreSel();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(name, false, arg);
    emit();
  };
  const insert = (html) => { restoreSel(); document.execCommand("insertHTML", false, html); emit(); };

  const insertLink = () => {
    saveSel();
    const url = window.prompt("Link URL (https://…)", "https://myeduport.ai/pricing");
    if (!url) return;
    if (!/^(https?:|mailto:)/i.test(url)) { alert("Links must start with https://, http:// or mailto:"); return; }
    cmd("createLink", url);
  };
  const insertButton = () => {
    saveSel();
    const text = window.prompt("Button text", "See plans & upgrade →");
    if (!text) return;
    const url = window.prompt("Button link", "https://myeduport.ai/pricing");
    if (!url || !/^https?:/i.test(url)) return;
    const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    insert(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="background:#0f9d6e;border-radius:8px;"><a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(text)}</a></td></tr></table><p><br></p>`);
  };
  const insertTable = () => {
    saveSel();
    const rows = Math.min(20, Math.max(1, parseInt(window.prompt("Rows", "3"), 10) || 0));
    const cols = Math.min(8, Math.max(1, parseInt(window.prompt("Columns", "2"), 10) || 0));
    if (!rows || !cols) return;
    const cell = (i) => `<td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:15px;color:#334155;${i === 0 ? "background:#f1f5f9;font-weight:700;" : ""}">${i === 0 ? "Header" : "&nbsp;"}</td>`;
    const body = Array.from({ length: rows }, (_, r) => `<tr>${Array.from({ length: cols }, () => cell(r)).join("")}</tr>`).join("");
    insert(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">${body}</table><p><br></p>`);
  };
  // Background color of the table cell containing the cursor
  const cellColor = (color) => {
    restoreSel();
    let n = window.getSelection()?.anchorNode;
    while (n && n !== ref.current && n.nodeName !== "TD" && n.nodeName !== "TH") n = n.parentNode;
    if (!n || n === ref.current) { alert("Put the cursor inside a table cell first."); return; }
    n.style.background = color;
    emit();
  };
  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { url } = await apiUpload(`${API}/image`, fd);
      const alt = (window.prompt("Image description (alt text)", "") || "").replace(/"/g, "");
      insert(`<img src="${url}" alt="${alt}" style="display:block;max-width:100%;height:auto;border:0;margin:12px 0;border-radius:8px;">`);
    } catch (e) { alert(e.message); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const imageByUrl = () => {
    saveSel();
    const url = window.prompt("Image URL (https://…)");
    if (!url || !/^https:\/\//i.test(url)) return;
    insert(`<img src="${url.replace(/"/g, "")}" alt="" style="display:block;max-width:100%;height:auto;border:0;margin:12px 0;">`);
  };

  const previewDoc = useMemo(() => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1f3461;padding:20px 32px;font-size:22px;font-weight:800;color:#fff;">MyEdu<span style="color:#34d399;">Port</span></td></tr>
<tr><td style="padding:32px;font-size:16px;line-height:1.6;color:#334155;">${(value || "").replace(/\{\{\s*first_name\s*\}\}/g, "Alex").replace(/\{\{\s*name\s*\}\}/g, "Alex Chen").replace(/\{\{\s*plan\s*\}\}/g, "Free").replace(/\{\{\s*email\s*\}\}/g, "alex@example.com")}</td></tr>
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">MyEduPort · myeduport.ai<br>You're receiving this email because you have a MyEduPort account.<br><u>Unsubscribe</u></td></tr>
</table></td></tr></table></body></html>`, [value]);

  const TABS = [["visual", "Visual"], ["html", "HTML"], ["preview", "Preview"]];
  return (
    <div>
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem" }}>
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className={mode === k ? "button" : "button ghost"} style={{ padding: "0.3rem 0.8rem", fontSize: "0.72rem" }} onClick={() => setMode(k)}>{l}</button>
        ))}
        {preheader && mode === "preview" && <span className="muted" style={{ fontSize: "0.78rem", alignSelf: "center", marginLeft: "0.5rem" }}>Inbox preview text: “{preheader}”</span>}
      </div>

      {mode === "visual" && !readOnly && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", padding: "0.5rem", border: "1px solid var(--rule)", borderBottom: "none", borderRadius: "var(--r-md) var(--r-md) 0 0", background: "var(--paper-warm)" }}>
          <select onMouseDown={saveSel} onChange={(e) => { cmd("formatBlock", e.target.value); e.target.value = ""; }} defaultValue="" style={{ height: 30, fontSize: "0.8rem" }}>
            <option value="" disabled>Style</option>
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <ToolBtn title="Bold" onClick={() => cmd("bold")}><b>B</b></ToolBtn>
          <ToolBtn title="Italic" onClick={() => cmd("italic")}><i>I</i></ToolBtn>
          <ToolBtn title="Underline" onClick={() => cmd("underline")}><u>U</u></ToolBtn>
          <ToolBtn title="Strikethrough" onClick={() => cmd("strikeThrough")}><s>S</s></ToolBtn>
          <label title="Text color" onMouseDown={saveSel} style={{ display: "inline-flex", alignItems: "center", gap: 3, height: 30, padding: "0 0.4rem", border: "1px solid var(--rule)", borderRadius: 6, background: "var(--surface)", fontSize: "0.8rem", cursor: "pointer" }}>
            A<input type="color" defaultValue="#1f3461" onChange={(e) => cmd("foreColor", e.target.value)} style={{ width: 22, height: 22, border: "none", padding: 0, background: "none" }} />
          </label>
          <label title="Highlight" onMouseDown={saveSel} style={{ display: "inline-flex", alignItems: "center", gap: 3, height: 30, padding: "0 0.4rem", border: "1px solid var(--rule)", borderRadius: 6, background: "var(--surface)", fontSize: "0.8rem", cursor: "pointer" }}>
            ▌<input type="color" defaultValue="#fef3c7" onChange={(e) => cmd("hiliteColor", e.target.value)} style={{ width: 22, height: 22, border: "none", padding: 0, background: "none" }} />
          </label>
          <ToolBtn title="Align left" onClick={() => cmd("justifyLeft")}>⯇</ToolBtn>
          <ToolBtn title="Center" onClick={() => cmd("justifyCenter")}>≡</ToolBtn>
          <ToolBtn title="Align right" onClick={() => cmd("justifyRight")}>⯈</ToolBtn>
          <ToolBtn title="Bulleted list" onClick={() => cmd("insertUnorderedList")}>• List</ToolBtn>
          <ToolBtn title="Numbered list" onClick={() => cmd("insertOrderedList")}>1. List</ToolBtn>
          <ToolBtn title="Link" onClick={insertLink}>🔗</ToolBtn>
          <ToolBtn title="Button (call to action)" onClick={insertButton}>▭ Button</ToolBtn>
          <ToolBtn title="Upload image" onClick={() => { saveSel(); fileRef.current?.click(); }}>{uploading ? "…" : "🖼 Image"}</ToolBtn>
          <ToolBtn title="Image from URL" onClick={imageByUrl}>🖼 URL</ToolBtn>
          <ToolBtn title="Insert table" onClick={insertTable}>▦ Table</ToolBtn>
          <label title="Cell background (cursor in a table cell)" onMouseDown={saveSel} style={{ display: "inline-flex", alignItems: "center", gap: 3, height: 30, padding: "0 0.4rem", border: "1px solid var(--rule)", borderRadius: 6, background: "var(--surface)", fontSize: "0.8rem", cursor: "pointer" }}>
            ▦<input type="color" defaultValue="#ecfdf5" onChange={(e) => cellColor(e.target.value)} style={{ width: 22, height: 22, border: "none", padding: 0, background: "none" }} />
          </label>
          <ToolBtn title="Divider" onClick={() => insert('<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"><p><br></p>')}>―</ToolBtn>
          <select onMouseDown={saveSel} onChange={(e) => { insert(e.target.value); e.target.value = ""; }} defaultValue="" style={{ height: 30, fontSize: "0.8rem" }}>
            <option value="" disabled>Merge tag</option>
            <option value="{{first_name}}">First name</option>
            <option value="{{name}}">Full name</option>
            <option value="{{plan}}">Plan</option>
            <option value="{{email}}">Email</option>
          </select>
          <ToolBtn title="Clear formatting" onClick={() => cmd("removeFormat")}>⌫ Format</ToolBtn>
          <ToolBtn title="Undo" onClick={() => cmd("undo")}>↶</ToolBtn>
          <ToolBtn title="Redo" onClick={() => cmd("redo")}>↷</ToolBtn>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display: "none" }} onChange={(e) => uploadImage(e.target.files?.[0])} />
        </div>
      )}

      {mode === "visual" && (
        <div
          ref={ref}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => { saveSel(); emit(); }}
          onKeyUp={saveSel}
          onMouseUp={saveSel}
          style={{ minHeight: 320, maxHeight: 640, overflowY: "auto", padding: "1.5rem", border: "1px solid var(--rule)", borderRadius: readOnly ? "var(--r-md)" : "0 0 var(--r-md) var(--r-md)", background: "#fff", fontSize: 16, lineHeight: 1.6, color: "#334155", outline: "none" }}
        />
      )}
      {mode === "html" && (
        <textarea
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          style={{ width: "100%", minHeight: 360, fontFamily: "ui-monospace, Menlo, monospace", fontSize: "0.8rem", padding: "0.85rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)" }}
        />
      )}
      {mode === "preview" && (
        <iframe title="Email preview" srcDoc={previewDoc} sandbox="" style={{ width: "100%", height: 640, border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "#f1f5f9" }} />
      )}
      {mode === "visual" && !value && !readOnly && <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>Start typing, or use “Draft with AI” above.</p>}
    </div>
  );
}

// ---------------- Audience ----------------
function AudienceBuilder({ audience, segments, readOnly, onChange }) {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ plan: "free", role: "student", q: "" });
  const [preview, setPreview] = useState(null);
  const [showPicker, setShowPicker] = useState((audience.userIds || []).length > 0);

  const [savedSegments, setSavedSegments] = useState([]);
  useEffect(() => {
    apiFetch(`${API}/groups`).then(setGroups).catch(() => {});
    apiFetch(`${API}/segments`).then(setSavedSegments).catch(() => {});
  }, []);
  useEffect(() => {
    if (!showPicker) return undefined;
    const t = setTimeout(() => {
      const qs = new URLSearchParams(filter).toString();
      apiFetch(`${API}/users?${qs}`).then(setUsers).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [filter, showPicker]);
  // Live recipient count
  useEffect(() => {
    const t = setTimeout(() => {
      apiFetch(`${API}/audience/preview`, { method: "POST", body: JSON.stringify({ audience }) }).then(setPreview).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [JSON.stringify(audience)]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key, value) => {
    const list = audience[key] || [];
    onChange({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });
  };
  const selectableUsers = users.filter((u) => !u.unsubscribed);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => audience.userIds.includes(u.id));

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.5rem" }}>Segments</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {segments.map((s) => (
            <label key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem", border: "1px solid var(--rule)", borderRadius: "var(--r-full)", fontSize: "0.85rem", cursor: readOnly ? "default" : "pointer", background: audience.segments.includes(s.key) ? "var(--success-soft)" : "var(--surface)" }}>
              <input type="checkbox" disabled={readOnly} checked={audience.segments.includes(s.key)} onChange={() => toggle("segments", s.key)} />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.5rem" }}>Saved segments <span className="muted" style={{ fontWeight: 400 }}>(from Audience — re-checked at send time)</span></div>
        {savedSegments.length === 0 ? <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>No saved segments yet — filter contacts in the Audience tab and “Save as segment”.</p> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {savedSegments.map((g) => (
              <label key={g.id} title={g.description || ""} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem", border: "1px solid var(--rule)", borderRadius: "var(--r-full)", fontSize: "0.85rem", cursor: readOnly ? "default" : "pointer", background: (audience.segmentIds || []).includes(g.id) ? "var(--success-soft)" : "var(--surface)" }}>
                <input type="checkbox" disabled={readOnly} checked={(audience.segmentIds || []).includes(g.id)} onChange={() => toggle("segmentIds", g.id)} />
                {g.name} <span className="muted">({g.count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.5rem" }}>Saved groups</div>
        {groups.length === 0 ? <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>No groups yet — create them in the Groups tab.</p> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {groups.map((g) => (
              <label key={g.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem", border: "1px solid var(--rule)", borderRadius: "var(--r-full)", fontSize: "0.85rem", cursor: readOnly ? "default" : "pointer", background: audience.groupIds.includes(g.id) ? "var(--success-soft)" : "var(--surface)" }}>
                <input type="checkbox" disabled={readOnly} checked={audience.groupIds.includes(g.id)} onChange={() => toggle("groupIds", g.id)} />
                {g.name} <span className="muted">({g.member_count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex-between" style={{ marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Pick individual users {audience.userIds.length > 0 && <span className="badge">{audience.userIds.length} selected</span>}</div>
          <button type="button" className="button ghost" style={small} onClick={() => setShowPicker(!showPicker)}>{showPicker ? "Hide list" : "Choose users…"}</button>
        </div>
        {showPicker && (
          <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              <select value={filter.plan} onChange={(e) => setFilter({ ...filter, plan: e.target.value })}>
                <option value="free">Free</option><option value="essential">Essential</option><option value="professional">Professional</option><option value="elite">Elite</option><option value="all">All plans</option>
              </select>
              <select value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value })}>
                <option value="student">Students</option><option value="parent">Parents</option><option value="counselor">Counselors</option><option value="all">All roles</option>
              </select>
              <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="Search name or email" style={{ flex: 1, minWidth: 160 }} />
              {!readOnly && (
                <button type="button" className="button ghost" style={small} onClick={() => {
                  const ids = selectableUsers.map((u) => u.id);
                  onChange({ userIds: allSelected ? audience.userIds.filter((id) => !ids.includes(id)) : [...new Set([...audience.userIds, ...ids])] });
                }}>{allSelected ? "Unselect shown" : "Select all shown"}</button>
              )}
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {users.length === 0 ? <p className="muted" style={{ fontSize: "0.82rem" }}>No users match.</p> : users.map((u) => (
                <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.35rem 0.25rem", borderBottom: "1px solid var(--rule-soft)", fontSize: "0.85rem", opacity: u.unsubscribed ? 0.5 : 1 }}>
                  <input type="checkbox" disabled={readOnly || u.unsubscribed} checked={audience.userIds.includes(u.id)} onChange={() => toggle("userIds", u.id)} />
                  <span style={{ flex: 1, minWidth: 0 }}>{u.name || "—"} <span className="muted">· {u.email}</span></span>
                  <span className="badge">{u.plan}</span>
                  {u.unsubscribed && <span className="muted" style={{ fontSize: "0.72rem" }}>unsubscribed</span>}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="input" style={{ marginBottom: 0 }}>
        <label>External emails <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(one per line or comma-separated; “Name &lt;email&gt;” works)</span></label>
        <textarea rows={4} disabled={readOnly} value={audience.external} onChange={(e) => onChange({ external: e.target.value })} placeholder={"parent@example.com\nJane Doe <jane@school.edu>"} />
        <p className="text-muted" style={{ fontSize: "0.75rem", margin: 0 }}>Only add people who agreed to hear from MyEduPort — unsolicited email hurts deliverability and may breach PDPA / anti-spam law.</p>
      </div>

      <div style={{ padding: "0.75rem 1rem", background: "var(--paper-warm)", borderRadius: "var(--r-md)", fontSize: "0.88rem" }}>
        {preview ? (
          <>
            <strong style={{ fontSize: "1.05rem", color: "var(--navy)" }}>{preview.count}</strong> recipient{preview.count === 1 ? "" : "s"}
            {preview.unsubscribed > 0 && <span className="muted"> · {preview.unsubscribed} unsubscribed excluded</span>}
            {preview.invalid?.length > 0 && <span style={{ color: "var(--error)" }}> · {preview.invalid.length} invalid: {preview.invalid.slice(0, 3).join(", ")}{preview.invalid.length > 3 ? "…" : ""}</span>}
            {preview.sample?.length > 0 && <div className="muted" style={{ fontSize: "0.78rem", marginTop: "0.3rem" }}>e.g. {preview.sample.slice(0, 5).map((r) => r.email).join(", ")}{preview.count > 5 ? "…" : ""}</div>}
          </>
        ) : "Counting recipients…"}
      </div>
    </div>
  );
}

// ---------------- Audience ----------------
const TYPE_LABEL = { student: "Student", parent: "Parent", counselor: "Counselor", external: "External", admin: "Admin" };
const EMPTY_FILTERS = { q: "", types: [], plans: [], trial: "", grades: [], countries: [], tags: [], status: "", joined_from: "", joined_to: "" };

// Minimal CSV parser (quoted fields, commas, newlines)
function parseCsv(text) {
  const rows = []; let row = []; let cur = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{ padding: "0.25rem 0.65rem", borderRadius: "var(--r-full)", border: `1px solid ${active ? "var(--gold-deep)" : "var(--rule)"}`, background: active ? "var(--success-soft)" : "var(--surface)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>
      {children}
    </button>
  );
}

function AudienceManager() {
  const [f, setF] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [groups, setGroups] = useState([]);
  const [segments, setSegments] = useState([]);
  const [msg, setMsg] = useState({ text: "", error: false });
  const [panel, setPanel] = useState(""); // "add" | "import" | "segment"
  const [bulk, setBulk] = useState({ tag: "", groupId: "" });
  const [newContact, setNewContact] = useState({ email: "", name: "", tags: "", consent: false });
  const [imp, setImp] = useState({ rows: [], tags: "", groupId: "", consent: false, fileName: "" });
  const [segForm, setSegForm] = useState({ name: "", description: "" });

  const say = (text, error = false) => setMsg({ text, error });
  const load = () => apiFetch(`${API}/audience?f=${encodeURIComponent(JSON.stringify(f))}`).then((d) => { setData(d); setSel(new Set()); }).catch((e) => say(e.message, true));
  const loadSide = () => {
    apiFetch(`${API}/groups`).then(setGroups).catch(() => {});
    apiFetch(`${API}/segments`).then(setSegments).catch(() => {});
  };
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [JSON.stringify(f)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadSide(); }, []);

  const toggleIn = (key, v) => setF((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));
  const activeFilters = Object.entries(f).filter(([k, v]) => (Array.isArray(v) ? v.length : v)).length;
  const contacts = data?.contacts || [];
  const allSelected = contacts.length > 0 && contacts.every((c) => sel.has(c.email));

  const doBulk = async (action, extra = {}) => {
    if (!sel.size) return;
    if (action === "delete_external" && !window.confirm(`Delete ${sel.size} external contact(s)? System users are never deleted here.`)) return;
    try {
      const r = await apiFetch(`${API}/audience/bulk`, { method: "POST", body: JSON.stringify({ emails: [...sel], action, ...extra }) });
      say(action === "delete_external" ? `Deleted ${r.affected} external contact(s)${r.skipped_users ? ` · skipped ${r.skipped_users} system user(s)` : ""}.` : `Done — ${r.affected} contact(s) updated.`);
      load(); loadSide();
    } catch (e) { say(e.message, true); }
  };
  const exportCsv = (rows) => {
    const head = ["email", "name", "type", "plan", "trial", "grade", "countries", "school", "tags", "groups", "subscribed", "joined"];
    const lines = [head.join(","), ...rows.map((c) => [c.email, c.name, c.type, c.plan || "", c.trial, c.grade, c.countries.join("; "), c.school, c.tags.join("; "), c.groups.map((g) => g.name).join("; "), c.subscribed ? "yes" : "no", c.joined ? new Date(c.joined).toISOString().slice(0, 10) : ""].map(csvCell).join(","))];
    const url = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `myeduport-audience-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const addContact = async (e) => {
    e.preventDefault();
    try { await apiFetch(`${API}/contacts`, { method: "POST", body: JSON.stringify(newContact) }); setNewContact({ email: "", name: "", tags: "", consent: false }); setPanel(""); say("Contact added."); load(); } catch (err) { say(err.message, true); }
  };
  const readCsv = async (file) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (!rows.length) { say("That file looks empty.", true); return; }
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const hasHeader = head.some((h) => ["email", "e-mail", "mail"].includes(h));
    const ei = hasHeader ? head.findIndex((h) => ["email", "e-mail", "mail"].includes(h)) : rows[0].findIndex((c) => c.includes("@"));
    const ni = hasHeader ? head.findIndex((h) => ["name", "full name", "fullname"].includes(h)) : (ei === 0 ? 1 : 0);
    const ti = hasHeader ? head.findIndex((h) => ["tags", "tag"].includes(h)) : -1;
    const parsed = (hasHeader ? rows.slice(1) : rows).map((r) => ({ email: (r[ei] || "").trim(), name: ni >= 0 ? (r[ni] || "").trim() : "", tags: ti >= 0 ? r[ti] : "" })).filter((r) => r.email);
    setImp((p) => ({ ...p, rows: parsed, fileName: file.name }));
  };
  const runImport = async () => {
    try {
      const r = await apiFetch(`${API}/contacts/import`, { method: "POST", body: JSON.stringify({ rows: imp.rows, tags: imp.tags, groupId: imp.groupId || null, consent: imp.consent }) });
      say(`Imported ${r.added} contact(s).${r.invalid.length ? ` Skipped ${r.invalid.length} invalid: ${r.invalid.slice(0, 3).join(", ")}${r.invalid.length > 3 ? "…" : ""}` : ""}`);
      setImp({ rows: [], tags: "", groupId: "", consent: false, fileName: "" }); setPanel(""); load(); loadSide();
    } catch (e) { say(e.message, true); }
  };
  const saveSegment = async (e) => {
    e.preventDefault();
    try { await apiFetch(`${API}/segments`, { method: "POST", body: JSON.stringify({ ...segForm, filters: f }) }); setSegForm({ name: "", description: "" }); setPanel(""); say("Segment saved — choose it in a campaign's Audience step."); loadSide(); } catch (err) { say(err.message, true); }
  };

  const S = data?.summary || {};
  const tiles = [["All contacts", data?.total], ["Subscribed", S.subscribed], ["Students", S.students], ["Parents", S.parents], ["External", S.external], ["In free trial", S.trial], ["Unsubscribed", S.unsubscribed]];
  const sel2 = { padding: "0.3rem 0.5rem", fontSize: "0.8rem" };

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.6rem" }}>
        {tiles.map(([k, v]) => (
          <div key={k} className="card" style={{ padding: "0.8rem 1rem" }}>
            <div className="muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--navy)" }}>{v ?? "…"}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 0 }}>Audience</h2>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button type="button" className="button ghost" style={small} onClick={() => setPanel(panel === "add" ? "" : "add")}>+ Add contact</button>
            <button type="button" className="button ghost" style={small} onClick={() => setPanel(panel === "import" ? "" : "import")}>Import CSV</button>
            <button type="button" className="button ghost" style={small} onClick={() => exportCsv(contacts)} disabled={!contacts.length}>Export CSV ({contacts.length})</button>
            <button type="button" className="button" style={small} onClick={() => setPanel(panel === "segment" ? "" : "segment")} disabled={!activeFilters}>Save as segment</button>
          </div>
        </div>
        {msg.text && <div style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", borderRadius: "var(--r-md)", background: msg.error ? "var(--error-soft)" : "var(--success-soft)", color: msg.error ? "var(--error)" : "var(--ink)" }}>{msg.text}</div>}

        {panel === "add" && (
          <form onSubmit={addContact} style={{ display: "grid", gap: "0.5rem", padding: "0.85rem", background: "var(--paper-warm)", borderRadius: "var(--r-md)", marginBottom: "0.85rem" }}>
            <div className="grid three">
              <input value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="email@example.com" required />
              <input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name (optional)" />
              <input value={newContact.tags} onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })} placeholder="Tags, comma-separated (e.g. open-house, grade-10)" />
            </div>
            <label style={{ fontSize: "0.82rem", display: "flex", gap: "0.4rem", alignItems: "center" }}><input type="checkbox" checked={newContact.consent} onChange={(e) => setNewContact({ ...newContact, consent: e.target.checked })} /> This person agreed to receive emails from MyEduPort</label>
            <div><button className="button" type="submit" style={small}>Add contact</button></div>
          </form>
        )}

        {panel === "import" && (
          <div style={{ display: "grid", gap: "0.5rem", padding: "0.85rem", background: "var(--paper-warm)", borderRadius: "var(--r-md)", marginBottom: "0.85rem" }}>
            <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>CSV with an <strong>email</strong> column (optional <strong>name</strong> and <strong>tags</strong> columns). Existing contacts are updated, not duplicated.</p>
            <input type="file" accept=".csv,text/csv" onChange={(e) => readCsv(e.target.files?.[0])} />
            {imp.rows.length > 0 && (
              <>
                <div style={{ fontSize: "0.82rem" }}><strong>{imp.rows.length}</strong> rows found in {imp.fileName} — e.g. {imp.rows.slice(0, 3).map((r) => r.email).join(", ")}</div>
                <div className="grid two">
                  <input value={imp.tags} onChange={(e) => setImp({ ...imp, tags: e.target.value })} placeholder="Tag everyone in this import (optional)" />
                  <select value={imp.groupId} onChange={(e) => setImp({ ...imp, groupId: e.target.value })}>
                    <option value="">Also add to a group (optional)</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <label style={{ fontSize: "0.82rem", display: "flex", gap: "0.4rem", alignItems: "center" }}><input type="checkbox" checked={imp.consent} onChange={(e) => setImp({ ...imp, consent: e.target.checked })} /> Everyone in this file agreed to receive emails from MyEduPort (required by PDPA / anti-spam law)</label>
                <div><button type="button" className="button" style={small} onClick={runImport} disabled={!imp.consent}>Import {imp.rows.length} contacts</button></div>
              </>
            )}
          </div>
        )}

        {panel === "segment" && (
          <form onSubmit={saveSegment} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", padding: "0.85rem", background: "var(--paper-warm)", borderRadius: "var(--r-md)", marginBottom: "0.85rem" }}>
            <input value={segForm.name} onChange={(e) => setSegForm({ ...segForm, name: e.target.value })} placeholder="Segment name, e.g. Grade 11 free students → US" required style={{ flex: "1 1 240px" }} />
            <input value={segForm.description} onChange={(e) => setSegForm({ ...segForm, description: e.target.value })} placeholder="Description (optional)" style={{ flex: "1 1 200px" }} />
            <button className="button" type="submit" style={small}>Save {data?.matched ?? 0}-contact segment</button>
            <p className="muted" style={{ fontSize: "0.75rem", margin: 0, flexBasis: "100%" }}>Segments are dynamic: new people who match these filters are included automatically at send time.</p>
          </form>
        )}

        {/* Filters */}
        <div style={{ display: "grid", gap: "0.55rem", padding: "0.85rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search name, email or school" style={{ flex: "1 1 220px" }} />
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} style={sel2}><option value="">Any status</option><option value="subscribed">Subscribed</option><option value="unsubscribed">Unsubscribed</option></select>
            <select value={f.trial} onChange={(e) => setF({ ...f, trial: e.target.value })} style={sel2}><option value="">Any trial</option><option value="active">In free trial</option><option value="ended">Trial ended</option><option value="none">No trial</option></select>
            <label className="muted" style={{ fontSize: "0.78rem" }}>Joined</label>
            <input type="date" value={f.joined_from} onChange={(e) => setF({ ...f, joined_from: e.target.value })} style={sel2} />
            <span className="muted">–</span>
            <input type="date" value={f.joined_to} onChange={(e) => setF({ ...f, joined_to: e.target.value })} style={sel2} />
            {activeFilters > 0 && <button type="button" className="button ghost" style={small} onClick={() => setF(EMPTY_FILTERS)}>Clear filters</button>}
          </div>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
            <span className="muted" style={{ fontSize: "0.75rem", width: 52 }}>Type</span>
            {["student", "parent", "counselor", "external"].map((t) => <Chip key={t} active={f.types.includes(t)} onClick={() => toggleIn("types", t)}>{TYPE_LABEL[t]}</Chip>)}
            <span className="muted" style={{ fontSize: "0.75rem", marginLeft: "0.75rem" }}>Plan</span>
            {["free", "essential", "professional", "elite"].map((t) => <Chip key={t} active={f.plans.includes(t)} onClick={() => toggleIn("plans", t)}>{t}</Chip>)}
          </div>
          {(data?.facets?.grades?.length > 0 || data?.facets?.countries?.length > 0 || data?.facets?.tags?.length > 0) && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {data.facets.grades.length > 0 && (
                <select value="" onChange={(e) => e.target.value && toggleIn("grades", e.target.value)} style={sel2}><option value="">+ Grade</option>{data.facets.grades.map((g) => <option key={g} value={g}>{g}</option>)}</select>
              )}
              {data.facets.countries.length > 0 && (
                <select value="" onChange={(e) => e.target.value && toggleIn("countries", e.target.value)} style={sel2}><option value="">+ Target country</option>{data.facets.countries.map((g) => <option key={g} value={g}>{g}</option>)}</select>
              )}
              {data.facets.tags.length > 0 && (
                <select value="" onChange={(e) => e.target.value && toggleIn("tags", e.target.value)} style={sel2}><option value="">+ Tag</option>{data.facets.tags.map((g) => <option key={g} value={g}>{g}</option>)}</select>
              )}
              {[...f.grades.map((v) => ["grades", v]), ...f.countries.map((v) => ["countries", v]), ...f.tags.map((v) => ["tags", v])].map(([k, v]) => (
                <Chip key={k + v} active onClick={() => toggleIn(k, v)}>{v} ×</Chip>
              ))}
            </div>
          )}
        </div>

        {/* Bulk actions */}
        {sel.size > 0 && (
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center", padding: "0.6rem 0.75rem", background: "var(--success-soft)", borderRadius: "var(--r-md)", marginBottom: "0.75rem", fontSize: "0.82rem" }}>
            <strong>{sel.size} selected</strong>
            <input value={bulk.tag} onChange={(e) => setBulk({ ...bulk, tag: e.target.value })} placeholder="tag" style={{ ...sel2, width: 110 }} />
            <button type="button" className="button ghost" style={small} onClick={() => doBulk("add_tag", { tag: bulk.tag })} disabled={!bulk.tag.trim()}>Add tag</button>
            <button type="button" className="button ghost" style={small} onClick={() => doBulk("remove_tag", { tag: bulk.tag })} disabled={!bulk.tag.trim()}>Remove tag</button>
            <select value={bulk.groupId} onChange={(e) => setBulk({ ...bulk, groupId: e.target.value })} style={sel2}><option value="">Group…</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <button type="button" className="button ghost" style={small} onClick={() => doBulk("add_to_group", { groupId: bulk.groupId })} disabled={!bulk.groupId}>Add to group</button>
            <button type="button" className="button ghost" style={small} onClick={() => doBulk("unsubscribe")}>Unsubscribe</button>
            <button type="button" className="button ghost" style={small} onClick={() => doBulk("resubscribe")}>Resubscribe</button>
            <button type="button" className="button ghost" style={small} onClick={() => exportCsv(contacts.filter((c) => sel.has(c.email)))}>Export</button>
            <button type="button" className="button ghost" style={{ ...small, color: "var(--error)" }} onClick={() => doBulk("delete_external")}>Delete external</button>
          </div>
        )}

        {!data ? <p className="muted">Loading…</p> : (
          <>
            <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 0.4rem" }}>Showing {contacts.length} of {data.matched} matching ({data.total} total)</p>
            <div style={{ overflowX: "auto", maxHeight: 560, overflowY: "auto" }}>
              <table style={{ width: "100%", minWidth: "980px", fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={allSelected} onChange={() => setSel(allSelected ? new Set() : new Set(contacts.map((c) => c.email)))} aria-label="Select all shown" /></th>
                    <th style={{ textAlign: "left" }}>Contact</th><th>Type</th><th>Plan</th><th>Grade</th><th style={{ textAlign: "left" }}>Countries</th><th style={{ textAlign: "left" }}>Tags · Groups</th><th>Status</th><th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.email} style={{ opacity: c.subscribed ? 1 : 0.55 }}>
                      <td><input type="checkbox" checked={sel.has(c.email)} onChange={() => setSel((p) => { const n = new Set(p); n.has(c.email) ? n.delete(c.email) : n.add(c.email); return n; })} /></td>
                      <td><strong style={{ color: "var(--ink)" }}>{c.name || "—"}</strong><div className="muted">{c.email}{c.school ? ` · ${c.school}` : ""}</div></td>
                      <td style={{ textAlign: "center" }}><span className="badge">{TYPE_LABEL[c.type] || c.type}</span></td>
                      <td style={{ textAlign: "center" }}>{c.plan || "—"}{c.trial === "active" && <div style={{ fontSize: "0.7rem", color: "var(--success)" }}>trial</div>}{c.trial === "ended" && <div className="muted" style={{ fontSize: "0.7rem" }}>trial ended</div>}</td>
                      <td style={{ textAlign: "center" }}>{c.grade ? c.grade.split(" / ")[0] : "—"}</td>
                      <td>{c.countries.join(", ") || "—"}</td>
                      <td>
                        {c.tags.map((t) => <span key={t} className="badge" style={{ marginRight: 3, background: "var(--success-soft)" }}>{t}</span>)}
                        {c.groups.map((g) => <span key={g.id} className="badge" style={{ marginRight: 3 }}>▦ {g.name}</span>)}
                        {!c.tags.length && !c.groups.length && <span className="muted">—</span>}
                      </td>
                      <td style={{ textAlign: "center", color: c.subscribed ? "var(--success)" : "var(--error)", fontWeight: 600 }}>{c.subscribed ? "Subscribed" : "Unsubscribed"}</td>
                      <td style={{ textAlign: "center" }}>{c.joined ? fmtDate(c.joined) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="section-title" style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>Saved segments</h2>
        <p className="muted" style={{ fontSize: "0.82rem" }}>Dynamic audiences you can pick in any campaign. Counts show subscribed contacts right now.</p>
        {segments.length === 0 ? <p className="muted" style={{ fontSize: "0.85rem" }}>None yet — set filters above and click “Save as segment”.</p> : (
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {segments.map((sg) => (
              <div key={sg.id} className="flex-between" style={{ padding: "0.55rem 0.8rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", gap: "0.5rem", flexWrap: "wrap" }}>
                <div><strong style={{ color: "var(--ink)" }}>{sg.name}</strong> <span className="badge">{sg.count}</span>{sg.description && <div className="muted" style={{ fontSize: "0.78rem" }}>{sg.description}</div>}</div>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button type="button" className="button ghost" style={small} onClick={() => setF({ ...EMPTY_FILTERS, ...sg.filters })}>Show contacts</button>
                  <button type="button" className="button ghost" style={{ ...small, color: "var(--error)" }} onClick={async () => { if (window.confirm(`Delete segment "${sg.name}"?`)) { await apiFetch(`${API}/segments/${sg.id}`, { method: "DELETE" }).catch(() => {}); loadSide(); } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Groups ----------------
function GroupsManager() {
  const [groups, setGroups] = useState([]);
  const [sel, setSel] = useState(null);
  const [members, setMembers] = useState([]);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [addText, setAddText] = useState("");
  const [msg, setMsg] = useState("");

  const loadGroups = () => apiFetch(`${API}/groups`).then(setGroups).catch((e) => setMsg(e.message));
  const loadMembers = (id) => apiFetch(`${API}/groups/${id}/members`).then(setMembers).catch((e) => setMsg(e.message));
  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { if (sel) loadMembers(sel.id); }, [sel?.id]);

  const create = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    try {
      const r = await apiFetch(`${API}/groups`, { method: "POST", body: JSON.stringify(newGroup) });
      setNewGroup({ name: "", description: "" });
      await loadGroups();
      setSel({ id: r.id, name: newGroup.name });
    } catch (err) { setMsg(err.message); }
  };
  const addMembers = async () => {
    if (!addText.trim()) return;
    try {
      const r = await apiFetch(`${API}/groups/${sel.id}/members`, { method: "POST", body: JSON.stringify({ emails: addText }) });
      setAddText("");
      setMsg(`Added ${r.added}.${r.invalid.length ? ` Skipped invalid: ${r.invalid.slice(0, 5).join(", ")}` : ""}`);
      loadMembers(sel.id); loadGroups();
    } catch (err) { setMsg(err.message); }
  };
  const addFreeUsers = async () => {
    try {
      const us = await apiFetch(`${API}/users?plan=free&role=student`);
      const r = await apiFetch(`${API}/groups/${sel.id}/members`, { method: "POST", body: JSON.stringify({ userIds: us.filter((u) => !u.unsubscribed).map((u) => u.id) }) });
      setMsg(`Added ${r.added} Free students.`);
      loadMembers(sel.id); loadGroups();
    } catch (err) { setMsg(err.message); }
  };

  return (
    <div className="grid two" style={{ alignItems: "start" }}>
      <div className="card">
        <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>Groups</h2>
        <form onSubmit={create} style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
          <input value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="New group name, e.g. Open-house leads" />
          <input value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="Description (optional)" />
          <button type="submit" className="button" style={small}>Create group</button>
        </form>
        {groups.length === 0 ? <p className="muted" style={{ fontSize: "0.85rem" }}>No groups yet.</p> : (
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {groups.map((g) => (
              <div key={g.id} onClick={() => setSel(g)} style={{ cursor: "pointer", padding: "0.6rem 0.8rem", borderRadius: "var(--r-md)", border: `1px solid ${sel?.id === g.id ? "var(--gold-deep)" : "var(--rule)"}`, background: sel?.id === g.id ? "var(--success-soft)" : "var(--surface)" }}>
                <div className="flex-between"><strong style={{ fontSize: "0.9rem" }}>{g.name}</strong><span className="badge">{g.member_count}</span></div>
                {g.description && <div className="muted" style={{ fontSize: "0.78rem" }}>{g.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        {!sel ? <p className="muted">Select a group to manage its members.</p> : (
          <>
            <div className="flex-between" style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: 0 }}>{sel.name}</h2>
              <button type="button" className="button ghost" style={{ ...small, color: "var(--error)" }} onClick={async () => {
                if (!window.confirm(`Delete group "${sel.name}"? Members aren't deleted from the system.`)) return;
                await apiFetch(`${API}/groups/${sel.id}`, { method: "DELETE" }).catch((e) => setMsg(e.message));
                setSel(null); setMembers([]); loadGroups();
              }}>Delete group</button>
            </div>
            {msg && <p style={{ fontSize: "0.82rem" }}>{msg}</p>}
            <div className="input">
              <label>Add emails</label>
              <textarea rows={3} value={addText} onChange={(e) => setAddText(e.target.value)} placeholder={"one@example.com\nName <two@example.com>"} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button type="button" className="button" style={small} onClick={addMembers}>Add</button>
              <button type="button" className="button ghost" style={small} onClick={addFreeUsers}>+ Add all Free students</button>
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {members.length === 0 ? <p className="muted" style={{ fontSize: "0.85rem" }}>No members yet.</p> : members.map((m) => (
                <div key={m.email} className="flex-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid var(--rule-soft)", fontSize: "0.85rem", gap: "0.5rem" }}>
                  <span style={{ minWidth: 0 }}>
                    {m.name ? `${m.name} · ` : ""}{m.email}
                    {m.user_id ? <span className="badge" style={{ marginLeft: "0.4rem" }}>{m.plan}</span> : <span className="muted" style={{ marginLeft: "0.4rem", fontSize: "0.72rem" }}>external</span>}
                    {m.unsubscribed && <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "var(--error)" }}>unsubscribed</span>}
                  </span>
                  <button type="button" className="button ghost" style={{ padding: "0.2rem 0.55rem", fontSize: "0.7rem" }} onClick={async () => {
                    await apiFetch(`${API}/groups/${sel.id}/members`, { method: "DELETE", body: JSON.stringify({ email: m.email }) }).catch((e) => setMsg(e.message));
                    loadMembers(sel.id); loadGroups();
                  }}>Remove</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- Unsubscribes ----------------
function Unsubscribes() {
  const [rows, setRows] = useState(null);
  const load = () => apiFetch(`${API}/unsubscribes`).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  return (
    <div className="card">
      <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Unsubscribed</h2>
      <p className="muted" style={{ fontSize: "0.85rem" }}>These addresses are automatically excluded from every campaign. Only re-subscribe someone who asked to be added back.</p>
      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">Nobody has unsubscribed.</p> : (
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: "0.85rem" }}>
            <thead><tr><th style={{ textAlign: "left" }}>Email</th><th style={{ textAlign: "left" }}>When</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email}>
                  <td>{r.email}</td>
                  <td>{fmt(r.created_at)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="button ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem" }} onClick={async () => {
                      if (!window.confirm(`Re-subscribe ${r.email}? Only do this if they asked.`)) return;
                      await apiFetch(`${API}/unsubscribes`, { method: "DELETE", body: JSON.stringify({ email: r.email }) });
                      load();
                    }}>Re-subscribe</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
