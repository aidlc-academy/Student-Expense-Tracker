/**
 * smoke.spec.js — Playwright smoke tests for task 12.1
 *
 * Covers:
 *  1. Persistence: add expense → reload → expense still visible
 *  2. Storage error banner: mock localStorage.setItem to throw → add expense → banner shown
 *  3. Empty dashboard: clear localStorage → load app → total is "₹ 0.00" and empty-state shown
 *
 * Requirements: 10.1, 10.2, 10.3, 8.1, 8.5
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the expenses view and fill + submit the add-expense form. */
async function addExpense(page, { amount, category, date, description } = {}) {
  await page.goto("/#expenses");
  // Wait for the form to be ready
  await page.waitForSelector("#expense-form");

  await page.fill("#amount-input", amount ?? "25.50");
  await page.selectOption("#category-input", category ?? "Food");
  await page.fill("#date-input", date ?? "2024-06-15");
  if (description !== undefined) {
    await page.fill("#description-input", description);
  }
  await page.click("#save-btn");
}

// ---------------------------------------------------------------------------
// Test 1 — Persistence: add expense, reload, assert it still appears
// ---------------------------------------------------------------------------

test("expense persists after page reload", async ({ page }) => {
  // Clear any pre-existing data so the test starts from a known state
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("student-expense-tracker:expenses");
  });

  // Add a uniquely identifiable expense
  await addExpense(page, {
    amount: "42.99",
    category: "Books",
    date: "2024-03-10",
    description: "Playwright Smoke Test Book",
  });

  // Wait for the expense to appear in the list before reloading
  await expect(page.locator("#expense-list")).toContainText("Playwright Smoke Test Book");

  // Reload the page (simulates a browser restart scenario)
  await page.goto("/#expenses");
  await page.waitForSelector("#expense-list");

  // Assert the expense survived the reload
  await expect(page.locator("#expense-list")).toContainText("Playwright Smoke Test Book");
  await expect(page.locator("#expense-list")).toContainText("₹ 42.99");
});

// ---------------------------------------------------------------------------
// Test 2 — Storage error banner: mock setItem to throw after app loads
// ---------------------------------------------------------------------------

test("storage-unavailable banner appears when localStorage write fails", async ({ page }) => {
  // Clear any pre-existing data
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("student-expense-tracker:expenses");
  });

  // Navigate to expenses view and wait for the page to fully load
  await page.goto("/#expenses");
  await page.waitForSelector("#expense-form");

  // Ensure the banner is hidden before we trigger a write failure
  await expect(page.locator("#storage-banner")).toBeHidden();

  // Monkey-patch localStorage.setItem to throw a QuotaExceededError
  // AFTER the page has loaded (so isStorageAvailable() passes at startup)
  // but BEFORE the user submits the form (so saveExpenses throws).
  //
  // We preserve the original setItem so the TEST_KEY write in
  // isStorageAvailable() already completed successfully, and only patch it now.
  await page.evaluate(() => {
    const origSetItem = localStorage.setItem.bind(localStorage);
    // Override to throw only on the real expense data key
    localStorage.setItem = (key, value) => {
      if (key === "student-expense-tracker:expenses") {
        const err = new DOMException("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      }
      origSetItem(key, value);
    };
  });

  // Fill and submit the form — saveExpenses will throw, triggering the banner
  await page.fill("#amount-input", "10.00");
  await page.selectOption("#category-input", "Transport");
  await page.fill("#date-input", "2024-06-20");
  await page.click("#save-btn");

  // The storage:error event should have been dispatched, showing the banner
  await expect(page.locator("#storage-banner")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 3 — Empty dashboard: no data → total "₹ 0.00" and empty-state message
// ---------------------------------------------------------------------------

test("dashboard shows ₹ 0.00 total and empty-state message when no expenses saved", async ({ page }) => {
  // Ensure localStorage has no expense data before the app boots
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("student-expense-tracker:expenses");
  });

  // Reload to the dashboard (default view)
  await page.goto("/");
  await page.waitForSelector("#dashboard");

  // Requirement 8.1: Dashboard is the default view
  await expect(page.locator("#dashboard")).toBeVisible();

  // Requirement 8.5: total is zero
  await expect(page.locator("#dashboard-total")).toContainText("₹ 0.00");

  // Requirement 8.5: empty-state message is present in the recent expenses section
  const emptyState = page.locator("#dashboard-recent .empty-state");
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText("No expenses recorded yet");
});
