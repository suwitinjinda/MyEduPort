// Sign-up consent form (MyEduPort_Consent_Form_202611): two required boxes, date of birth
// for students, and the parent card for under-20s. Plus the parent's consent page.
import { test, expect } from "@playwright/test";
import { expectNoHorizontalOverflow, expectNoSeriousA11y } from "./helpers.js";

const year = new Date().getFullYear();

test("consent form", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("Create an account").click();
  const create = page.getByRole("button", { name: "Create account" });
  await expect(create).toBeDisabled();
  await page.getByLabel(/Terms of Service/).check();
  await page.getByLabel(/outside Thailand/).check();
  await expect(create).toBeDisabled(); // student: no date of birth yet

  // Under 20 → parent card appears and needs an email
  await page.getByLabel("Day").selectOption("1");
  await page.getByLabel("Month").selectOption("1");
  await page.getByLabel("Year").selectOption(String(year - 15));
  await expect(page.getByLabel("Parent or guardian's email")).toBeVisible();
  await expect(create).toBeDisabled();
  await page.getByLabel("Parent or guardian's email").fill("parent@example.com");
  await expect(create).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11y(page);

  // 20 or older → no parent card
  await page.getByLabel("Year").selectOption(String(year - 25));
  await expect(page.getByLabel("Parent or guardian's email")).toHaveCount(0);
  await expect(create).toBeEnabled();

  // Parents don't give a date of birth
  await page.locator("select").first().selectOption("parent");
  await expect(page.getByText("Date of birth")).toHaveCount(0);
  await expect(create).toBeEnabled();
});

test("parent consent link that doesn't exist", async ({ page }) => {
  await page.goto("/parent-consent/not-a-real-token");
  await expect(page.getByRole("heading", { name: "This link isn't working" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
