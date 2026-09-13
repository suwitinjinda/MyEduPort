import React from "react";

/**
 * Editorial-style scaffold used by all static informational pages.
 * Pages pass a title, intro, sections list, and an optional note.
 */
export default function StaticPage({ title, intro, sections = [], note }) {
  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.75rem", marginBottom: "2.5rem", maxWidth: "780px" }}>
        <div className="eyebrow">MyEduPort</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          {title}
        </h1>
        <p className="lede" style={{ marginTop: "1rem", maxWidth: "62ch" }}>
          {intro}
        </p>
      </header>

      <section style={{ display: "grid", gap: "2rem" }}>
        {sections.map((section, idx) => (
          <article
            key={section.title}
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: "2rem",
              padding: "2rem 0",
              borderTop: "1px solid var(--rule)"
            }}
            className="static-row"
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.85rem",
                  color: "var(--gold-deep)",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  marginBottom: "0.4rem"
                }}
              >
                {String(idx + 1).padStart(2, "0")} / {String(sections.length).padStart(2, "0")}
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  color: "var(--ink)",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2
                }}
              >
                {section.title}
              </h2>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.05rem",
                  color: "var(--ink-soft)",
                  lineHeight: 1.7,
                  marginBottom: section.items?.length ? "1rem" : 0
                }}
              >
                {section.description}
              </p>
              {section.items?.length ? (
                <ul className="list">
                  {section.items.map((item) => (
                    <li key={item} style={{ fontFamily: "var(--font-serif)" }}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {note ? (
        <aside className="card highlight" style={{ marginTop: "2.5rem", padding: "1.75rem" }}>
          <div className="advisory-label">Key note</div>
          <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink-soft)", fontSize: "1rem", lineHeight: 1.7, marginTop: "0.5rem" }}>
            {note}
          </p>
        </aside>
      ) : null}

      <style>{`
        @media (max-width: 768px) {
          .static-row { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
}
