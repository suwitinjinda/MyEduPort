// Every page a customer or student can reach should load clean and be readable.
import { test } from "@playwright/test";
import { signIn, watchForProblems, expectNoSeriousA11y, expectNoHorizontalOverflow, expectNoPageScroll } from "./helpers.js";
import { expect } from "@playwright/test";

const PUBLIC = ["/", "/pricing", "/login", "/guide", "/about", "/contact", "/privacy", "/application", "/admission-resources", "/career-resources", "/user-manual", "/news-events",
  // campaign landing pages — the shared template and one campaign built on it
  "/lp", "/lp/example-parents"];
const STUDENT_PAGES = ["/dashboard", "/profile", "/activities", "/recommendations", "/compare", "/tasks", "/chat", "/essay", "/export", "/settings"];
const STUDENT = { id: 1, role: "student", email: "admin@gmail.com" };

for (const path of PUBLIC) {
  test(`public ${path} loads clean`, async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto(path);
    await page.waitForTimeout(1500);
    await expect(page.locator("body")).not.toBeEmpty();
    await expectNoHorizontalOverflow(page);
    await expectNoPageScroll(page);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

for (const path of STUDENT_PAGES) {
  test(`student ${path} loads clean`, async ({ page }) => {
    const problems = watchForProblems(page);
    await signIn(page, STUDENT);
    await page.goto(path);
    await page.waitForTimeout(2500);
    await expectNoHorizontalOverflow(page);
    await expectNoPageScroll(page);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("key pages pass the accessibility + contrast audit", async ({ page }) => {
  for (const path of ["/", "/pricing", "/login"]) {
    await page.goto(path);
    await page.waitForTimeout(1200);
    await expectNoSeriousA11y(page);
  }
});
