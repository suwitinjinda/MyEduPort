// Classic and unified student menus: icons sized, switching both ways, highlight follows the page.
import { test, expect } from "@playwright/test";
import { signIn, watchForProblems, expectNoHorizontalOverflow, expectNoSeriousA11y } from "./helpers.js";
test("classic vs unified menu", async ({ page }, info) => {
  const tag = info.project.name, mob = tag === "mobile";
  const problems = watchForProblems(page);
  await signIn(page, { id: 1, role: "student", email: "admin@gmail.com" });
  await page.evaluate(() => localStorage.removeItem("mep-nav-layout"));
  // classic: Portfolio page quick menu icons are normal size
  await page.goto("/profile");
  await page.locator(".pe-sidebar").getByRole("button", { name: "Quick menu" }).click();
  const box = await page.locator(".pe-sidebar .nav-link svg").first().boundingBox();
  expect(box.width).toBeLessThanOrEqual(20);
  await expect(page.locator(".top-nav").getByRole("link", { name: "Compare" })).toBeVisible();
  // switch
  await page.getByRole("button", { name: /Try the new menu/ }).click();
  await expect(page.locator(".pe-sidebar")).toHaveCount(0);
  const nav = page.locator(".student-nav");
  if (mob) await page.locator(".student-nav-toggle").click();
  await expect(nav.locator(".student-nav-sub a.active")).toHaveText(/Personal/);
  await nav.getByRole("link", { name: /Academics/ }).click();
  await expect(page).toHaveURL(/section=academics/);
  if (mob) await page.locator(".student-nav-toggle").click();
  await expect(nav.locator(".student-nav-sub a.active")).toHaveText(/Academics/);
  await expect(page.locator(".top-nav").getByRole("link", { name: "My Portfolio" })).toHaveClass(/active/);
  await expect(page.locator(".top-nav").getByRole("link", { name: "Compare" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  for (const [p, label] of [["/dashboard", "Dashboard"], ["/tasks", "Tasks"], ["/compare", "Compare my list"], ["/settings", "Settings"]]) {
    await page.goto(p); await page.waitForTimeout(800);
    if (mob) await page.locator(".student-nav-toggle").click();
    await expect(page.locator(".student-nav nav .nav-link.active"), p).toHaveText(new RegExp(label));
    await expect(page.locator(".student-nav-sub"), p).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }
  await expect(page.getByRole("heading", { name: "Parent invite code" })).toBeVisible();
  await expectNoSeriousA11y(page);
  await page.goto("/dashboard"); await page.waitForTimeout(1200);
  // and back
  await page.getByRole("button", { name: /classic menu/ }).click();
  await expect(page.locator(".dash-sidebar").getByRole("button", { name: "Quick menu" })).toBeVisible();
  await expect(page.locator(".top-nav").getByRole("link", { name: "Compare" })).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("mep-nav-layout"));
  expect(problems, problems.join("\n")).toEqual([]);
});
