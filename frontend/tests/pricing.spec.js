// The Pricing page is what customers see before they pay — check it closely.
import { test, expect } from "@playwright/test";
import { signIn, watchForProblems, expectNoSeriousA11y, expectNoHorizontalOverflow, API } from "./helpers.js";

const STUDENT = { id: 5, role: "student", email: "munmunback@gmail.com" };

test.describe("Pricing", () => {
  test("renders every visible plan with the price the server charges", async ({ page }) => {
    const problems = watchForProblems(page);
    const plans = await (await fetch(`${API}/api/options/plans`)).json();
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Choose your plan/i })).toBeVisible();

    for (const p of plans) {
      const card = page.locator("article.card").filter({ has: page.getByText(p.name, { exact: true }) }).first();
      await expect(card, `${p.name} card is shown`).toBeVisible();
      await expect(card, `${p.name} monthly price`).toContainText(`$${p.monthly}`);
    }
    // annual toggle swaps every price
    await page.getByRole("button", { name: /Annual/i }).click();
    for (const p of plans.filter((x) => x.key !== "free")) {
      const card = page.locator("article.card").filter({ has: page.getByText(p.name, { exact: true }) }).first();
      await expect(card, `${p.name} annual price`).toContainText(`$${p.annual}`);
    }
    expect(problems).toEqual([]);
  });

  test("comparison table matches the real plan limits", async ({ page }) => {
    const plans = await (await fetch(`${API}/api/options/plans`)).json();
    await page.goto("/pricing");
    const table = page.locator("table").first();
    await expect(table).toBeVisible();
    const headers = (await table.locator("th").allInnerTexts()).map((t) => t.trim().toUpperCase());
    for (const p of plans) expect(headers, `"${p.name}" column present`).toContain(p.name.toUpperCase());

    const row = (label) => table.locator("tr").filter({ hasText: label }).first();
    // spot-check the rows that are easy to get wrong
    const essential = plans.find((p) => p.key === "essential");
    if (essential) {
      await expect(row("MEPAi University Match")).toContainText(String(essential.limits.match));
      await expect(row("Export PDF Portfolio")).toBeVisible();
    }
  });

  test("no accessibility or contrast problems, nothing overflows", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForTimeout(1500);
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11y(page);
  });

  test("signed-in student can start checkout and reach Stripe", async ({ page }) => {
    await signIn(page, STUDENT);
    await page.goto("/pricing");
    await page.waitForTimeout(1500);
    const btn = page.getByRole("button", { name: /^Subscribe to / }).first();
    await expect(btn).toBeEnabled();
    await Promise.all([page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 }), btn.click()]);
    await expect(page.locator("body")).toContainText(/MyEduPort/i);
  });

  test("logged-out visitor is sent to sign in, then back to pricing", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/pricing");
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /^Subscribe to / }).first().click();
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Sign in|Create your account/i })).toBeVisible();
  });
});
