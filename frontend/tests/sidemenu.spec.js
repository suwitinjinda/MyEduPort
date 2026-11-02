// Side menus stay put: every Portfolio section (activities and essays included) opens beside
// the section menu, and the student Quick menu stays beside every page it links to.
import { test, expect } from "@playwright/test";
import { signIn, watchForProblems, expectNoHorizontalOverflow } from "./helpers.js";
const S = { id: 1, role: "student", email: "admin@gmail.com" };
test("side menus stay", async ({ page }, info) => {
  const tag = info.project.name, mob = tag === "mobile";
  const problems = watchForProblems(page);
  await signIn(page, S);
  await page.goto("/profile");
  const sections = page.locator(".pe-sidebar");
  await sections.getByRole("button", { name: /Extracurricular/ }).click();
  await expect(page).toHaveURL(/section=extracurriculars/);
  await expect(page.getByText("The five categories")).toBeVisible();
  await expect(sections).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await sections.getByRole("button", { name: /Documents/ }).click();
  await page.getByRole("button", { name: "Open MEPAi →" }).first().click();
  await expect(page).toHaveURL(/section=documents&essay=/);
  await expect(page.getByText("Where you come alive.")).toBeVisible();
  await expect(sections).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "← Back to Documents" }).click();
  await expect(page).toHaveURL(/section=documents$/);
  await page.goBack(); await expect(page).toHaveURL(/essay=/);
  // old addresses forward into Portfolio
  await page.goto("/activities"); await expect(page).toHaveURL(/\/profile\?section=extracurriculars/);
  await page.goto("/essay"); await expect(page).toHaveURL(/section=documents&essay=new/);
  // quick menu stays on its pages
  for (const p of ["/compare", "/tasks", "/recommendations", "/chat", "/export", "/settings"]) {
    await page.goto(p); await page.waitForTimeout(1200);
    await expect(page.locator(".dash-sidebar"), p).toHaveCount(1);
    if (!mob) await expect(page.locator(".dash-sidebar .nav-link.active"), p).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  }
  await page.goto("/chat"); await page.waitForTimeout(1500);
  // Personal / Essays in quick menu highlight correctly
  await page.goto("/profile?section=documents");
  await page.locator(".pe-sidebar").getByRole("button", { name: "Quick menu" }).click();
  await expect(page.locator(".pe-sidebar .nav-link.active")).toHaveText(/Essays/);
  expect(problems, problems.join("\n")).toEqual([]);
});
