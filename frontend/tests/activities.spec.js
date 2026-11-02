// Extracurricular activities can be reopened, edited and deleted (photos/videos go with them).
import { test, expect } from "@playwright/test";
import fs from "fs";
import { signIn, watchForProblems, expectNoHorizontalOverflow } from "./helpers.js";
test("activity edit/delete", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const problems = watchForProblems(page);
  page.on("dialog", (d) => d.accept());
  await signIn(page, { id: 1, role: "student", email: "admin@gmail.com" });
  await page.goto("/profile?section=extracurriculars");
  await expect(page.getByText("Your activities")).toBeVisible();
  const before = await page.locator("article", { hasText: "View / Edit" }).count();
  // create
  await page.getByPlaceholder(/FRC Robotics/).fill("ZZ Fencing");
  await page.getByPlaceholder(/Co-Captain/).fill("Fencer");
  await page.locator("input[type=file][multiple]").setInputFiles(new URL("./fixtures/pixel.png", import.meta.url).pathname);
  await page.getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByText(/^Saved\.$/)).toBeVisible({ timeout: 20000 });
  const card = page.locator("article", { hasText: "ZZ Fencing" });
  await expect(card).toHaveCount(1);
  // stays in Extracurricular with the list in view; incomplete → On going, no score yet
  await expect(page).toHaveURL(/section=extracurriculars/);
  await expect(page.getByRole("heading", { name: /Your activities/ })).toBeInViewport();
  await expect(card).toContainText("On going");
  await expect(card).toContainText("No score yet");
  await expect(card).toContainText(/Missing: .*category/);
  // edit
  await card.getByRole("button", { name: "View / Edit" }).click();
  await expect(page.getByRole("heading", { name: /Editing: ZZ Fencing/ })).toBeVisible();
  await expect(page.getByPlaceholder(/Co-Captain/)).toHaveValue("Fencer");
  await page.getByPlaceholder(/FRC Robotics/).fill("ZZ Fencing Captain");
  await page.getByPlaceholder(/Co-Captain/).fill("Team Captain");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  const card2 = page.locator("article", { hasText: "ZZ Fencing Captain" });
  await expect(card2).toContainText("Team Captain");
  await expect(page.locator("article", { hasText: "View / Edit" })).toHaveCount(before + 1); // updated, not duplicated
  await expect(page.getByPlaceholder(/FRC Robotics/)).toHaveValue(""); // back to new-activity form
  // cancel edit restores
  await card2.getByRole("button", { name: "View / Edit" }).click();
  await page.getByRole("button", { name: "Cancel editing" }).first().click();
  await expect(page.getByRole("heading", { name: "Extracurricular Activity Editor" })).toBeVisible();
  // file path of its media, then delete
  const token = await page.evaluate(() => localStorage.getItem("myeduport_token"));
  const res = await (await page.request.get(`${process.env.UI_API_URL || ""}/api/students/me/activities`, { headers: { Authorization: "Bearer " + token } })).json();
  const act = res.find((a) => a.title === "ZZ Fencing Captain");
  const file = act.media[0]?.file_path;
  await card2.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("article", { hasText: "ZZ Fencing Captain" })).toHaveCount(0);
  if (file && fs.existsSync("/home/dev/MyEduPort/backend/uploads")) expect(fs.existsSync("/home/dev/MyEduPort/backend" + file)).toBe(false);
  await expectNoHorizontalOverflow(page);
  expect(problems, problems.join("\n")).toEqual([]);
});
