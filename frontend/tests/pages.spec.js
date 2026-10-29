// Every page a customer or student can reach should load clean and be readable.
import { test } from "@playwright/test";
import { signIn, watchForProblems, expectNoSeriousA11y, expectNoHorizontalOverflow, expectNoPageScroll } from "./helpers.js";
import { expect } from "@playwright/test";

const PUBLIC = ["/", "/pricing", "/login", "/guide", "/about", "/contact", "/privacy", "/application", "/admission-resources", "/career-resources", "/user-manual", "/news-events",
  // campaign landing pages — the shared template and one campaign built on it
  "/lp", "/lp/example-parents",
  // partner program sign-up
  "/partners"];
const STUDENT_PAGES = ["/dashboard", "/profile", "/activities", "/recommendations", "/compare", "/tasks", "/chat", "/essay", "/export", "/settings", "/rewards", "/admission-results"];
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

// The two projects run at 1400px and phone width, which once hid a header that pushed every
// page sideways on small laptops and landscape tablets. Sweep the widths in between.
test("header fits at in-between widths", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport is set explicitly");
  for (const user of [null, STUDENT]) {
    if (user) await signIn(page, user);
    for (const width of [800, 900, 1024, 1040, 1041, 1100, 1200]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(user ? "/dashboard" : "/");
      await page.waitForTimeout(800);
      await expectNoHorizontalOverflow(page);
    }
  }
});

// The Google button only renders when VITE_GOOGLE_CLIENT_ID was present at build time, so a
// build made without it silently drops Google sign-in for everyone. Catch that here.
test("sign-in page shows the Google button", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("iframe[src*='accounts.google.com']").first()).toBeVisible({ timeout: 15000 });
});
