import React from "react";

// Renders the light Markdown that MEPAi and EduBot write — bold, italics, inline code,
// bullet and numbered lists, headings, links — as React elements.
//
// Deliberately NOT innerHTML: this text comes back from a language model, so building an
// HTML string from it would mean sanitising it correctly forever. React escapes text
// nodes by itself, so there is nothing to sanitise and nothing to get wrong later.
//
// Anything it doesn't recognise is shown as the plain text it already is, which is the
// safe failure: a stray asterisk is a cosmetic problem, a swallowed sentence is not.

// Emphasis has to hug its text — "**bold**" yes, "a ** b" no. Without that rule a line
// like "5 * 3 = 15 and a ** b" gets read as italics and the sentence comes out mangled.
// Each alternative therefore demands a non-space character right inside the markers.
const BOLD_SPLIT = new RegExp(
  "(" + [
    /\*\*(?:[^\s*][^*\n]*?[^\s*]|[^\s*])\*\*/,  // **bold**
    /__(?:[^\s_][^_\n]*?[^\s_]|[^\s_])__/,      // __bold__
    /\*(?:[^\s*][^*\n]*?[^\s*]|[^\s*])\*/,      // *italic*
    /_(?:[^\s_][^_\n]*?[^\s_]|[^\s_])_/,        // _italic_
    /`[^`\n]+`/,                                // `code`
    /\[[^\]\n]+\]\([^)\s]*\)/                   // [text](url)
  ].map((r) => r.source).join("|") + ")",
  "g"
);

// Only linkify things that can't execute. javascript: and data: URLs never pass.
function safeHref(url) {
  const u = String(url || "").trim();
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : null;
}

// One line of text → spans, with the inline markers turned into elements
function inline(text, keyPrefix = "i") {
  return String(text ?? "").split(BOLD_SPLIT).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    const link = part.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      // Not a link we will follow (javascript:, data:, …) — show the original text
      // verbatim rather than a half-eaten version of it
      return href
        ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{link[1]}</a>
        : <React.Fragment key={key}>{part}</React.Fragment>;
    }
    if ((part.startsWith("**") && part.endsWith("**") && part.length > 4) ||
        (part.startsWith("__") && part.endsWith("__") && part.length > 4)) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
        (part.startsWith("_") && part.endsWith("_") && part.length > 2)) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} style={{ background: "var(--surface-warm, rgba(0,0,0,0.05))", padding: "0.1em 0.35em", borderRadius: "4px", fontSize: "0.92em" }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

// Use this where a single line needs its markers rendered (a list item, a table cell)
export function InlineMarkdown({ text }) {
  return <>{inline(text)}</>;
}

const BULLET = /^\s*([-*+•·])\s+(.*)$/;
const NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,4})\s+(.*)$/;

export default function Markdown({ text, style }) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let para = [];
  let list = null; // { ordered, items: [] }

  const flushPara = () => {
    if (!para.length) return;
    blocks.push({ type: "p", lines: para });
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ type: "list", ...list });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    if (!line.trim()) { flushPara(); flushList(); continue; }

    const h = line.match(HEADING);
    if (h) { flushPara(); flushList(); blocks.push({ type: "h", level: h[1].length, text: h[2] }); continue; }

    const b = line.match(BULLET);
    if (b) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(b[2]);
      continue;
    }

    const n = line.match(NUMBER);
    if (n) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [], start: Number(n[1]) || 1 }; }
      list.items.push(n[2]);
      continue;
    }

    // A plain line that follows a list item belongs to that item, not a new paragraph
    if (list) { list.items[list.items.length - 1] += " " + line.trim(); continue; }
    para.push(line);
  }
  flushPara();
  flushList();

  const liStyle = { marginBottom: "0.25rem" };

  return (
    <div style={style}>
      {blocks.map((b, i) => {
        if (b.type === "h") {
          const size = [0, "1.15rem", "1.05rem", "0.98rem", "0.92rem"][b.level] || "1rem";
          return <div key={i} style={{ fontWeight: 700, fontSize: size, margin: i ? "0.7rem 0 0.3rem" : "0 0 0.3rem" }}>{inline(b.text, `h${i}`)}</div>;
        }
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={i} start={b.ordered ? b.start : undefined}
              style={{ margin: "0.4rem 0", paddingLeft: "1.25rem" }}>
              {b.items.map((it, j) => <li key={j} style={liStyle}>{inline(it, `l${i}-${j}`)}</li>)}
            </Tag>
          );
        }
        // Single newlines inside a paragraph are real line breaks in chat
        return (
          <p key={i} style={{ margin: i ? "0.5rem 0 0" : 0 }}>
            {b.lines.map((ln, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inline(ln, `p${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
