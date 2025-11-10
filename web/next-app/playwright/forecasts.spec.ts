import { test, expect } from "@playwright/test";

test.describe("Forecast Studio", () => {
  test("renders primary controls", async ({ page }) => {
    await page.goto("/forecasts");
    await expect(page.getByRole("heading", { name: "Forecast Studio" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download CSV" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  });
});

