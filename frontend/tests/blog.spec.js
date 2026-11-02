// Admin → Blog: posts are cleaned before they are stored, drafts stay hidden, and only
// admins can write.
import { test, expect } from "@playwright/test";
import jwt from "jsonwebtoken";
import { signIn } from "./helpers.js";
const ADMIN = { id: 1, role: "student", email: "admin@gmail.com" };
test("sanitising, drafts, permissions", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop");
  const tok = await signIn(page, ADMIN);
  const H = { Authorization: "Bearer " + tok };
  const parent = jwt.sign({ id: 2, role: "parent" }, process.env.JWT_SECRET);
  expect((await request.get("/api/admin/blog", { headers: { Authorization: "Bearer " + parent } })).status()).toBe(403);
  expect((await request.post("/api/admin/blog", { headers: { Authorization: "Bearer " + parent }, data: { title: "x" } })).status()).toBe(403);
  const evil = '<p onclick="alert(1)">Hi<script>alert(1)</script></p><img src=x onerror=alert(1)><img src="javascript:alert(1)"><a href="javascript:alert(1)">bad</a><iframe src="https://evil.example"></iframe><h1>Big</h1><a href="https://ok.example">ok</a>';
  const r = await request.post("/api/admin/blog", { headers: H, data: { title: "ZZ test", category: "scholarship", slug: "zz-test", status: "draft", body_html: evil } });
  expect(r.status()).toBe(200);
  const { id } = await r.json();
  const saved = await (await request.get("/api/admin/blog/" + id, { headers: H })).json();
  for (const bad of ["script", "onerror", "onclick", "javascript:", "iframe", "<h1"]) expect(saved.body_html).not.toContain(bad);
  expect(saved.body_html).toContain('href="https://ok.example"');
  expect((await request.get("/api/blog/zz-test")).status()).toBe(404); // draft hidden
  expect((await request.post("/api/admin/blog", { headers: H, data: { title: "dup", category: "articles", slug: "zz-test", body_html: "<p>x</p>" } })).status()).toBe(409);
  expect((await request.delete("/api/admin/blog/" + id, { headers: H })).status()).toBe(200);
});
