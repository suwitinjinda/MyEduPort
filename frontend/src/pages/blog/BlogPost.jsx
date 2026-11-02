import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { fmtDate } from "../../utils/date.js";
import { sectionLabel } from "./sections.js";

// One Admission Resources post. The body is HTML cleaned by the server when it was saved
// (routes/blog.js), so it is rendered as-is.

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setPost(null); setErr("");
    apiFetch(`/api/blog/${encodeURIComponent(slug)}`).then(setPost).catch((e) => setErr(e.message));
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    const prev = document.title;
    document.title = `${post.title} — MyEduPort`;
    return () => { document.title = prev; };
  }, [post]);

  if (err) {
    return (
      <div className="card" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "2.5rem" }}>
        <p className="muted">This post isn't available.</p>
        <Link className="button ghost" to="/admission-resources">← All resources</Link>
      </div>
    );
  }
  if (!post) return <p className="muted">Loading…</p>;

  return (
    <article className="blog-article">
      <h1>{post.title}</h1>
      <div className="blog-card-meta" style={{ marginBottom: "1.75rem" }}>{sectionLabel(post.category)} · {fmtDate(post.published_at)}</div>
      <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.body_html }} />
      <div style={{ borderTop: "1px solid var(--rule)", marginTop: "2.5rem", paddingTop: "1.25rem" }}>
        <Link className="button ghost" to="/admission-resources">← All resources</Link>
      </div>
    </article>
  );
}
