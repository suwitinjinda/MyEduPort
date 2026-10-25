import { AxeBuilder } from "@axe-core/playwright";
import { expect } from "@playwright/test";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dir, "..", "..", "backend", ".env") });

export const API = process.env.UI_API_URL || "http://127.0.0.1:4000";

// Sign in as an existing account without going through the login form
export async function signIn(page, user) {
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "30m" });
  await page.goto("/");
  await page.evaluate((t) => localStorage.setItem("myeduport_token", t), token);
  return token;
}

// Fail on anything the browser itself reports as broken
export function watchForProblems(page) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`JS error: ${e.message}`));
  page.on("crash", () => problems.push("page crashed"));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (r.status() >= 400 && (u.origin === new URL(page.url() || "http://127.0.0.1").origin || u.port === "4000")) {
      problems.push(`${r.status()} ${u.pathname}`);
    }
  });
  return problems;
}

// Accessibility + colour-contrast audit (catches invisible text, unlabelled controls…)
export async function auditPage(page, { disable = [] } = {}) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .disableRules(disable)
    .analyze();
  return r.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    count: v.nodes.length,
    sample: v.nodes[0]?.target?.join(" ")
  }));
}

export async function expectNoSeriousA11y(page, opts) {
  const v = (await auditPage(page, opts)).filter((x) => ["serious", "critical"].includes(x.impact));
  expect(v, `Accessibility problems:\n${v.map((x) => `  • [${x.impact}] ${x.id} — ${x.help} (${x.count}×, e.g. ${x.sample})`).join("\n")}`).toEqual([]);
}

// Nothing may overflow the viewport horizontally.
// Content inside a deliberately scrollable box (overflow-x auto/scroll/hidden) is fine —
// that's how wide tables are meant to work — so only report elements that actually push
// the page itself sideways.
export async function expectNoHorizontalOverflow(page) {
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const clipped = (el) => {
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
      }
      return false;
    };
    return [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (r.right <= w + 1) return false;
        const st = getComputedStyle(el);
        if (st.position === "fixed" || st.visibility === "hidden" || st.display === "none") return false;
        return !clipped(el);
      })
      .slice(0, 6)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${(el.className || "").toString().trim().split(/\s+/)[0] || "-"} right=${Math.round(el.getBoundingClientRect().right)} > ${w}`);
  });
  expect(over, `Elements push the page sideways on this screen:\n  ${over.join("\n  ")}`).toEqual([]);
}

// The page itself must not scroll sideways
export async function expectNoPageScroll(page) {
  const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(d.sw, `Page scrolls sideways: scrollWidth ${d.sw} > ${d.cw}`).toBeLessThanOrEqual(d.cw + 1);
}
