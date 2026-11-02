// Sign-up consent form: required boxes, age question, guardian fields for under-20s.
import { test, expect } from "@playwright/test";
import { expectNoHorizontalOverflow, expectNoSeriousA11y } from "./helpers.js";
test("consent form", async ({ page }, info) => {
  await page.goto("/login");
  await page.getByText("Create an account").click();
  const create = page.getByRole("button", { name: "Create account" });
  await expect(create).toBeDisabled();
  await page.getByLabel(/Terms of Service/).check();
  await page.getByLabel(/MEPAi, may use/).check();
  await expect(create).toBeDisabled(); // student: age not chosen
  await page.getByLabel("Under 20").check();
  await expect(page.getByLabel(/parent or guardian has read/)).toBeVisible();
  await page.getByLabel(/parent or guardian has read/).check();
  await expect(create).toBeDisabled(); // no guardian email yet
  await page.getByLabel(/guardian.s email/).fill("parent@example.com");
  await expect(create).toBeEnabled();
  await page.getByLabel("20 or older").check();
  await expect(page.getByLabel(/guardian's email/)).toHaveCount(0);
  await expect(create).toBeEnabled();
  await page.locator("select").first().selectOption("parent");
  await expect(page.getByText("Your age")).toHaveCount(0);
  await expect(create).toBeEnabled();
  await page.locator("select").first().selectOption("student");
  await page.getByLabel("Under 20").check();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11y(page);
});
