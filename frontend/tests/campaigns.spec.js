// Admin → Campaigns end to end: create, build a link, open the page as a visitor, pause, delete.
import { test, expect } from "@playwright/test";
import { signIn, watchForProblems, expectNoHorizontalOverflow, expectNoSeriousA11y } from "./helpers.js";
const ADMIN = { id: 1, role: "student", email: "admin@gmail.com" };
test("campaign admin flow", async ({ page, request }, info) => {
  const mob = info.project.name === "mobile";
  const slug = "zz-test-" + (mob ? "m" : "d");
  const problems = watchForProblems(page);
  const tok = await signIn(page, ADMIN);
  // permissions + validation via API
  const H = { Authorization: "Bearer " + tok, "Content-Type": "application/json" };
  const parentTok = (await (async()=>{ const jwt=(await import("jsonwebtoken")).default; return jwt.sign({id:2,role:"parent"}, process.env.JWT_SECRET); })());
  expect((await request.get("/api/admin/campaigns", { headers: { Authorization: "Bearer " + parentTok } })).status()).toBe(403);
  expect((await request.post("/api/admin/campaigns", { headers: H, data: { name: "x", slug: "Bad Slug!" } })).status()).toBe(400);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Campaigns", exact: true }).click();
  await page.getByRole("button", { name: "+ New campaign" }).click();
  await page.getByLabel("Campaign name").fill("ZZ Test Campaign");
  await page.getByLabel("Link name").fill(slug);
  await page.getByLabel("Headline", { exact: true }).fill("ZZ Headline Works");
  await page.getByLabel("Text under the headline").fill("Plain then **bold bit** end");
  await expectNoHorizontalOverflow(page);
  
  await page.getByRole("button", { name: "Create campaign" }).click();
  await expect(page.getByText("is live")).toBeVisible();
  const linkBox = page.getByLabel("Campaign link");
  await expect(linkBox).toHaveValue(new RegExp("/lp/" + slug + "\\?utm_source=facebook&utm_campaign=" + slug));
  await page.getByLabel("Partner code").fill("krupoom");
  await expect(linkBox).toHaveValue(new RegExp("ref=KRUPOOM"));
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11y(page);
  
  // dup slug
  expect((await request.post("/api/admin/campaigns", { headers: H, data: { name: "dup", slug } })).status()).toBe(409);
  // public page as logged-out visitor
  await page.evaluate(() => localStorage.clear());
  await page.goto("/lp/" + slug + "?utm_source=facebook");
  await expect(page.locator("h1").first()).toHaveText("ZZ Headline Works");
  await expect(page.locator("strong", { hasText: "bold bit" })).toBeVisible();
  await expect(page.locator("text=**")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  const list = await (await request.get("/api/admin/campaigns", { headers: H })).json();
  const c = list.campaigns.find((x) => x.slug === slug);
  expect(c.visits).toBe(1);
  // pause → standard page
  await request.put("/api/admin/campaigns/" + c.id, { headers: H, data: { status: "paused" } });
  await page.goto("/lp/" + slug);
  await expect(page.locator("h1").first()).not.toHaveText("ZZ Headline Works");
  // code-defined example still works
  await page.goto("/lp/example-parents");
  await expect(page.locator("h1").first()).toContainText("Child");
  expect((await request.delete("/api/admin/campaigns/" + c.id, { headers: H })).status()).toBe(200);
  expect(problems, problems.join("\n")).toEqual([]);
});
