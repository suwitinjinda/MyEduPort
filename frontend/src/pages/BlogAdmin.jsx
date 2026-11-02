import React, { useEffect, useRef, useState } from "react";
import { apiFetch, apiUpload } from "../api/client";
import { fmtDate } from "../utils/date.js";
import { SECTIONS, sectionLabel } from "./blog/sections.js";

// Admin → Blog: the posts shown on Admission Resources. Write a post here, or import a
// Word file (.docx) — its headings, lists, links, tables and pictures come across, and it
// opens as a draft to check before publishing. The server cleans all HTML on save.

const API = "/api/admin/blog";
const BLANK = { title: "", category: "articles", slug: "", status: "draft", excerpt: "", cover_image: "", body_html: "" };
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;
const toSlug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
const small = { fontSize: "0.75rem", padding: "0.3rem 0.7rem" };
const hint = { textTransform: "none", letterSpacing: 0 };

function Tool({ title, onClick, children }) {
  return (
    <button type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      style={{ height: 30, minWidth: 30, padding: "0 0.5rem", border: "1px solid var(--rule)", borderRadius: 6, background: "var(--surface)", color: "var(--ink)", fontSize: "0.8rem", cursor: "pointer" }}>
      {children}
    </button>
  );
}

function PostEditor({ value, onChange }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const savedRange = useRef(null);
  const [mode, setMode] = useState("visual");
  const [uploading, setUploading] = useState(false);

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
  const cmd = (name, arg) => { restoreSel(); document.execCommand(name, false, arg); emit(); };
  const insert = (html) => { restoreSel(); document.execCommand("insertHTML", false, html); emit(); };

  const link = () => {
    saveSel();
    const url = window.prompt("Link URL (https://…)", "https://");
    if (!url || url === "https://") return;
    if (!/^(https?:|mailto:)/i.test(url)) { alert("Links must start with https://, http:// or mailto:"); return; }
    cmd("createLink", url);
  };
  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { url } = await apiUpload(`${API}/images`, fd);
      const alt = (window.prompt("Describe the image (for screen readers and search)", "") || "").replace(/["<>]/g, "");
      insert(`<img src="${url}" alt="${alt}"><p><br></p>`);
    } catch (e) { alert(e.message); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem" }}>
        {[["visual", "Visual"], ["html", "HTML"]].map(([k, l]) => (
          <button key={k} type="button" className={mode === k ? "button" : "button ghost"} style={{ padding: "0.3rem 0.8rem", fontSize: "0.72rem" }} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      {mode === "visual" ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", padding: "0.5rem", border: "1px solid var(--rule)", borderBottom: "none", borderRadius: "var(--r-md) var(--r-md) 0 0", background: "var(--paper-warm)" }}>
            <select aria-label="Text style" onMouseDown={saveSel} onChange={(e) => { cmd("formatBlock", e.target.value); e.target.value = ""; }} defaultValue="" style={{ height: 30, fontSize: "0.8rem" }}>
              <option value="" disabled>Style</option>
              <option value="p">Paragraph</option>
              <option value="h2">Heading</option>
              <option value="h3">Sub-heading</option>
              <option value="blockquote">Quote</option>
            </select>
            <Tool title="Bold" onClick={() => cmd("bold")}><b>B</b></Tool>
            <Tool title="Italic" onClick={() => cmd("italic")}><i>I</i></Tool>
            <Tool title="Underline" onClick={() => cmd("underline")}><u>U</u></Tool>
            <Tool title="Bulleted list" onClick={() => cmd("insertUnorderedList")}>• List</Tool>
            <Tool title="Numbered list" onClick={() => cmd("insertOrderedList")}>1. List</Tool>
            <Tool title="Center" onClick={() => cmd("justifyCenter")}>≡</Tool>
            <Tool title="Link" onClick={link}>🔗 Link</Tool>
            <Tool title="Insert image" onClick={() => { saveSel(); fileRef.current?.click(); }}>{uploading ? "Uploading…" : "🖼 Image"}</Tool>
            <Tool title="Divider" onClick={() => insert("<hr><p><br></p>")}>―</Tool>
            <Tool title="Clear formatting" onClick={() => cmd("removeFormat")}>⌫ Format</Tool>
            <Tool title="Undo" onClick={() => cmd("undo")}>↶</Tool>
            <Tool title="Redo" onClick={() => cmd("redo")}>↷</Tool>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display: "none" }} onChange={(e) => uploadImage(e.target.files?.[0])} />
          </div>
          <div
            ref={ref}
            className="blog-body"
            contentEditable
            suppressContentEditableWarning
            aria-label="Post content"
            role="textbox"
            aria-multiline="true"
            onInput={emit}
            onBlur={() => { saveSel(); emit(); }}
            onKeyUp={saveSel}
            onMouseUp={saveSel}
            style={{ minHeight: 360, maxHeight: 720, overflowY: "auto", padding: "1.25rem 1.5rem", border: "1px solid var(--rule)", borderRadius: "0 0 var(--r-md) var(--r-md)", background: "#fff", outline: "none" }}
          />
        </>
      ) : (
        <textarea aria-label="Post HTML" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
          style={{ width: "100%", minHeight: 400, fontFamily: "ui-monospace, Menlo, monospace", fontSize: "0.8rem", padding: "0.85rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)" }} />
      )}
    </div>
  );
}

export default function BlogAdmin() {
  const [posts, setPosts] = useState(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(null); // null = list view
  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });
  const docxRef = useRef(null);
  const coverRef = useRef(null);

  const load = () => apiFetch(API).then((d) => setPosts(d.posts)).catch((e) => setMsg({ text: e.message, error: true }));
  useEffect(() => { load(); }, []);

  const say = (text, error = false) => setMsg({ text, error });
  const openNew = () => { setForm({ ...BLANK, category: filter || "articles" }); setEditingId(null); setSlugTouched(false); say(""); };
  const openEdit = async (p) => {
    try {
      const full = await apiFetch(`${API}/${p.id}`);
      setForm({ title: full.title, category: full.category, slug: full.slug, status: full.status, excerpt: full.excerpt || "", cover_image: full.cover_image || "", body_html: full.body_html });
      setEditingId(p.id); setSlugTouched(true); say("");
    } catch (e) { say(e.message, true); }
  };

  const importDocx = async (file) => {
    if (!file) return;
    setBusy(true); say("Reading the Word file…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const d = await apiUpload(`${API}/import-docx`, fd);
      setForm({ ...BLANK, category: filter || "articles", title: d.title, slug: d.slug, excerpt: d.excerpt || "", cover_image: d.cover_image || "", body_html: d.body_html });
      setEditingId(null); setSlugTouched(!!d.slug);
      say(`Imported "${d.title}"${d.images ? ` with ${d.images} picture${d.images > 1 ? "s" : ""}` : ""}. Check the section and wording, then Publish.`);
    } catch (e) { say(e.message, true); } finally { setBusy(false); if (docxRef.current) docxRef.current.value = ""; }
  };

  const uploadCover = async (file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { url } = await apiUpload(`${API}/images`, fd);
      setForm((f) => ({ ...f, cover_image: url }));
    } catch (e) { say(e.message, true); } finally { if (coverRef.current) coverRef.current.value = ""; }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setTitle = (e) => { const title = e.target.value; setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : toSlug(title) })); };
  const slugOk = !form?.slug || SLUG_RE.test(form.slug);

  const save = async (status) => {
    setBusy(true); say("");
    try {
      const body = { ...form, status };
      const r = await apiFetch(editingId ? `${API}/${editingId}` : API, { method: editingId ? "PUT" : "POST", body: JSON.stringify(body) });
      const slug = r.slug || form.slug;
      setForm(null); setEditingId(null);
      await load();
      say(status === "published" ? `Published — live at /admission-resources/${slug}` : "Saved as a draft. Only admins can see it.");
    } catch (e) { say(e.message, true); } finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    try { await apiFetch(`${API}/${p.id}`, { method: "DELETE" }); load(); } catch (e) { say(e.message, true); }
  };

  const shown = (posts || []).filter((p) => !filter || p.category === filter);

  return (
    <div>
      <p className="muted" style={{ fontSize: "0.9rem", marginTop: 0, maxWidth: "72ch" }}>
        Posts appear on <a href="/admission-resources" target="_blank" rel="noopener noreferrer">Admission Resources</a> under their section.
        Drafts are only visible here.
      </p>

      {msg.text && (
        <div className="card compact" style={{ marginBottom: "1rem", background: msg.error ? "var(--error-soft)" : "var(--success-soft)", color: msg.error ? "var(--error-deep)" : "var(--ink)" }}>{msg.text}</div>
      )}

      <input ref={docxRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={(e) => importDocx(e.target.files?.[0])} />

      {!form && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <button className="button" onClick={openNew}>+ New post</button>
            <button className="button ghost" disabled={busy} onClick={() => docxRef.current?.click()}>{busy ? "Importing…" : "Import Word file (.docx)"}</button>
          </div>
          <nav className="blog-tabs" aria-label="Filter by section">
            <button className={!filter ? "active" : ""} onClick={() => setFilter("")}>All ({(posts || []).length})</button>
            {SECTIONS.map((s) => (
              <button key={s.key} className={filter === s.key ? "active" : ""} onClick={() => setFilter(s.key)}>
                {s.label} ({(posts || []).filter((p) => p.category === s.key).length})
              </button>
            ))}
          </nav>
          {posts === null ? <p className="muted">Loading…</p> : shown.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem" }}><p className="muted" style={{ margin: 0 }}>No posts here yet.</p></div>
          ) : (
            <div className="grid" style={{ gap: "0.75rem" }}>
              {shown.map((p) => (
                <article key={p.id} className="card compact" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ width: 96, aspectRatio: "16 / 9", borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--paper-warm)" }}>
                    {p.cover_image && <img src={p.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  </div>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ overflowWrap: "anywhere" }}>{p.title}</strong>
                      <span className="badge" style={p.status === "published"
                        ? { background: "var(--success-soft)", color: "var(--success-deep)", border: "1px solid var(--success-deep)" }
                        : { background: "#fef3c7", color: "#92400e", border: "1px solid #b45309" }}>
                        {p.status === "published" ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
                      {sectionLabel(p.category)} · {p.published_at ? `published ${fmtDate(p.published_at)}` : `edited ${fmtDate(p.updated_at)}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {p.status === "published" && <a className="button ghost" style={small} href={`/admission-resources/${p.slug}`} target="_blank" rel="noopener noreferrer">View</a>}
                    <button className="button ghost" style={small} onClick={() => openEdit(p)}>Edit</button>
                    <button className="button ghost" style={small} onClick={() => remove(p)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {form && (
        <section className="card">
          <h3 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{editingId ? "Edit post" : "New post"}</h3>
          <label className="input">
            <span>Title</span>
            <input value={form.title} onChange={setTitle} placeholder="Why Study in Asia?" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <label className="input">
              <span>Section</span>
              <select value={form.category} onChange={set("category")}>
                {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label className="input">
              <span>Link name</span>
              <input value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })); }} placeholder="why-study-in-asia" aria-invalid={!slugOk} />
            </label>
          </div>
          <p style={{ fontSize: "0.8rem", margin: "0.4rem 0 0", color: slugOk ? "var(--ink-muted)" : "var(--error-deep)" }}>
            {slugOk ? <>Address: <strong>/admission-resources/{form.slug || "…"}</strong>{editingId && form.status === "published" && " — changing it breaks links already shared."}</>
              : "Link name: lowercase English letters, numbers and dashes only."}
          </p>

          <label className="input" style={{ marginTop: "1rem" }}>
            <span>Summary <span className="text-muted" style={hint}>(shown on the card — left blank, the opening lines are used)</span></span>
            <textarea rows={2} value={form.excerpt} onChange={set("excerpt")} />
          </label>

          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
              Cover picture <span className="text-muted" style={{ fontWeight: 400 }}>(left empty, the first picture in the post is used)</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 160, aspectRatio: "16 / 9", borderRadius: 8, overflow: "hidden", background: "var(--paper-warm)", border: "1px solid var(--rule)" }}>
                {form.cover_image && <img src={form.cover_image} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
              <button type="button" className="button ghost" style={small} onClick={() => coverRef.current?.click()}>{form.cover_image ? "Change" : "Upload"}</button>
              {form.cover_image && <button type="button" className="button ghost" style={small} onClick={() => setForm((f) => ({ ...f, cover_image: "" }))}>Remove</button>}
              <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display: "none" }} onChange={(e) => uploadCover(e.target.files?.[0])} />
            </div>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>Content</div>
            <PostEditor key={editingId || form.slug || "new"} value={form.body_html} onChange={(html) => setForm((f) => ({ ...f, body_html: html }))} />
          </div>

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            <button className="button" disabled={busy || !form.title.trim() || !slugOk} onClick={() => save("published")}>{busy ? "Saving…" : form.status === "published" ? "Save & keep published" : "Publish"}</button>
            <button className="button ghost" disabled={busy || !form.title.trim() || !slugOk} onClick={() => save("draft")}>{form.status === "published" ? "Unpublish (back to draft)" : "Save draft"}</button>
            <button className="button ghost" disabled={busy} onClick={() => { setForm(null); setEditingId(null); say(""); }}>Cancel</button>
          </div>
        </section>
      )}
    </div>
  );
}
