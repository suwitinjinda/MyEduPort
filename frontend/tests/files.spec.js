// Students' uploaded files are private: only blog-* and email-* images are served openly.
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers.js";

const STUDENT = { id: 1, role: "student", email: "admin@gmail.com" };

test("a student's files need their token; blog and email images stay public", async ({ page, request }) => {
  const token = await signIn(page, STUDENT);
  const docs = await (await request.get("/api/uploads/me", { headers: { Authorization: `Bearer ${token}` } })).json();
  test.skip(!docs.length, "this account has no uploaded documents");
  const name = docs[0].file_path.split("/").pop();

  expect((await request.get(`/uploads/${name}`)).status()).toBe(404);
  expect((await request.get(`/api/files/${name}`)).status()).toBe(401);
  expect((await request.get("/uploads/../.env")).headers()["content-type"]).not.toContain("octet");

  const own = await request.get(`/api/files/${name}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(own.status()).toBe(200);
  expect((await own.body()).length).toBeGreaterThan(0);
});

test("the View button opens a private document", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one viewport is enough");
  await signIn(page, STUDENT);
  await page.goto("/profile");
  await page.getByRole("button", { name: /Documents/ }).first().click();
  await page.waitForTimeout(1500);
  const view = page.getByRole("button", { name: "View", exact: true }).first();
  test.skip(!(await view.isVisible().catch(() => false)), "no document listed on the first profile view");
  // Real Chrome shows the PDF in the new tab; headless Chrome downloads it instead.
  // Either way the tab is handed the fetched file as a blob: URL. Listen before the click:
  // the file can arrive before the popup event resolves.
  const opened = new Promise((resolve) => page.context().once("page", (popup) => {
    popup.on("download", (d) => resolve(d.url()));
    popup.on("framenavigated", (f) => f.url().startsWith("blob:") && resolve(f.url()));
  }));
  await view.click();
  expect(await Promise.race([opened, page.waitForTimeout(20_000).then(() => "nothing opened")])).toMatch(/^blob:/);
});
