// Back button on every inner page; task Ongoing/Done ticks keep due date and notes; Universities page basics.
import { test, expect } from "@playwright/test";
import { signIn, watchForProblems, expectNoHorizontalOverflow } from "./helpers.js";
const S = { id: 1, role: "student", email: "admin@gmail.com" };
test("back + tasks + unis", async ({ page }, info) => {
  const tag = info.project.name;
  const problems = watchForProblems(page);
  page.on("dialog", (d) => d.accept());
  await signIn(page, S);
  const back = page.locator(".back-button");
  for (const [p, n] of [["/dashboard", 0], ["/", 0], ["/tasks", 1], ["/recommendations", 1], ["/compare", 1], ["/about", 1], ["/pricing", 1], ["/profile", 1]]) {
    await page.goto(p); await page.waitForTimeout(700);
    await expect(back, p).toHaveCount(n);
  }
  // in-app back returns to previous page; direct open goes home
  await page.goto("/dashboard"); await page.waitForTimeout(800);
  const qm = page.locator(".dash-sidebar").getByRole("button", { name: "Quick menu" });
  if ((await qm.getAttribute("aria-expanded")) === "false") await qm.click();
  await page.locator(".dash-sidebar a.nav-link", { hasText: "Tasks" }).click();
  await expect(page).toHaveURL(/\/tasks/);
  await back.click(); await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/compare"); await back.click(); await expect(page).toHaveURL(/\/dashboard|\/tasks/);
  // tasks
  await page.goto("/tasks");
  await page.getByPlaceholder(/Register for SAT/).fill("ZZ task " + tag);
  await page.locator("input[type=date]").first().fill("2026-12-20");
  await page.locator("form").getByLabel("Ongoing").check();
  await page.locator("form textarea").fill("zz note");
  await page.getByRole("button", { name: "Add task" }).click();
  const card = page.locator("article", { hasText: "ZZ task " + tag });
  await expect(card).toHaveCount(1);
  await expect(card.getByLabel(/Ongoing/)).toBeChecked();
  await card.getByLabel(/Done/).check();
  await expect(card.getByLabel(/Done/)).toBeChecked();
  await expect(card.getByLabel(/Ongoing/)).not.toBeChecked();
  await page.reload(); await page.waitForTimeout(800);
  const card2 = page.locator("article", { hasText: "ZZ task " + tag });
  await expect(card2.getByLabel(/Done/)).toBeChecked();
  await expect(card2).toContainText("Due 20/12/2026");
  await expect(card2).toContainText("zz note");
  await card2.getByLabel(/Done/).uncheck();
  await page.waitForTimeout(600);
  await expect(card2.getByLabel(/Done/)).not.toBeChecked();
  await expectNoHorizontalOverflow(page);
  await card2.getByRole("button", { name: "Remove" }).click();
  await expect(page.locator("article", { hasText: "ZZ task " + tag })).toHaveCount(0);
  // universities
  await page.goto("/recommendations"); await page.waitForTimeout(2500);
  await expect(page.getByText("MEPAi University Recommendations")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(problems, problems.join("\n")).toEqual([]);
});
