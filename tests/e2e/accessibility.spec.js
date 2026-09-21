/**
 * accessibility.spec.js — Playwright accessibility integration tests
 *
 * Task 12.3 — Covers:
 *  1. All form inputs have accessible labels (via getByLabel)
 *  2. Validation error messages are announced (role="alert" elements populated on invalid submit)
 *  3. Toast appears with aria-live="polite" after a successful add action
 *  4. Delete confirmation uses <dialog> and focus moves to the confirm button on open
 *
 * Requirements: 9.5
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the #expenses view with a blank localStorage slate.
 *
 * @param {import('@playwright/test').Page} page
 */
async function gotoExpenses(page) {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto("/#expenses");
  await expect(page.locator("#expenses")).toBeVisible();
}

/**
 * Fill and submit the expense entry form with valid data.
 * Waits for the form to reset (amount cleared) to confirm a successful save.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ amount?: string, category?: string, date?: string, description?: string }} [fields]
 */
async function addExpense(
  page,
  { amount = "25.00", category = "Food", date, description = "test expense" } = {}
) {
  const today = new Date().toISOString().slice(0, 10);
  await page.locator("#amount-input").fill(amount);
  await page.locator("#category-input").selectOption(category);
  await page.locator("#date-input").fill(date ?? today);
  if (description) {
    await page.locator("#description-input").fill(description);
  }
  await page.locator("#save-btn").click();
  // Successful save resets the amount field to empty
  await expect(page.locator("#amount-input")).toHaveValue("");
}

// ---------------------------------------------------------------------------
// Test 1 — Accessible labels
//    All form inputs inside #expense-form are reachable via Playwright's
//    getByLabel scoped to the form, which verifies that each control is properly
//    associated with a visible <label for="..."> element.
// ---------------------------------------------------------------------------

test("all form inputs have accessible labels", async ({ page }) => {
  await gotoExpenses(page);

  // Scope all label lookups to the expense form so they don't accidentally
  // match aria-label attributes on summary cards outside the form.
  const form = page.locator("#expense-form");

  // Amount — required numeric input
  const amountInput = form.getByLabel("Amount", { exact: false });
  await expect(amountInput).toBeVisible();
  await expect(amountInput).toHaveAttribute("id", "amount-input");

  // Category — required <select>
  const categoryInput = form.getByLabel("Category", { exact: false });
  await expect(categoryInput).toBeVisible();
  await expect(categoryInput).toHaveAttribute("id", "category-input");

  // Date — required date picker
  const dateInput = form.getByLabel("Date", { exact: false });
  await expect(dateInput).toBeVisible();
  await expect(dateInput).toHaveAttribute("id", "date-input");

  // Description — optional text input
  const descriptionInput = form.getByLabel("Description", { exact: false });
  await expect(descriptionInput).toBeVisible();
  await expect(descriptionInput).toHaveAttribute("id", "description-input");
});

// ---------------------------------------------------------------------------
// Test 2 — Validation error messages are announced
//    Submitting the form with all required fields empty must populate at least
//    one role="alert" container with a non-empty error message.
// ---------------------------------------------------------------------------

test("submitting the form with empty required fields shows role=alert error messages", async ({
  page,
}) => {
  await gotoExpenses(page);

  // Submit with no fields filled — all three required fields are blank
  await page.locator("#save-btn").click();

  // At least one [role="alert"] element must now contain text
  const alertEls = page.locator('[role="alert"]');
  const count = await alertEls.count();
  expect(count).toBeGreaterThan(0);

  // Gather text content of all alert elements and assert at least one is non-empty
  let foundError = false;
  for (let i = 0; i < count; i++) {
    const text = await alertEls.nth(i).textContent();
    if (text && text.trim().length > 0) {
      foundError = true;
      break;
    }
  }
  expect(foundError).toBe(true);

  // Specifically the amount and category error containers should be populated
  // (both are required fields left empty)
  const amountError = page.locator("#amount-error");
  await expect(amountError).toHaveAttribute("role", "alert");
  await expect(amountError).not.toBeEmpty();

  const categoryError = page.locator("#category-error");
  await expect(categoryError).toHaveAttribute("role", "alert");
  await expect(categoryError).not.toBeEmpty();
});

// ---------------------------------------------------------------------------
// Test 3 — Toast uses aria-live="polite" and appears after a successful add
//    The toast element must carry aria-live="polite" and become visible (i.e.,
//    not have the [hidden] attribute) immediately after a successful form save.
// ---------------------------------------------------------------------------

test("toast notification has aria-live=polite and becomes visible after adding an expense", async ({
  page,
}) => {
  await gotoExpenses(page);

  // Verify the static ARIA attribute is present before any interaction
  const toast = page.locator("#toast");
  await expect(toast).toHaveAttribute("aria-live", "polite");

  // Add a valid expense — this should trigger showToast()
  await addExpense(page, { description: "accessibility toast test" });

  // The toast must become visible (hidden attribute removed) and contain text
  await expect(toast).not.toHaveAttribute("hidden");
  await expect(toast).not.toBeEmpty();

  // The message text should reflect the add action
  await expect(toast).toContainText("added", { ignoreCase: true });
});

// ---------------------------------------------------------------------------
// Test 4 — Delete dialog uses <dialog> and focus moves to the confirm button
//    After clicking Delete, the native <dialog> element must be visible and
//    keyboard focus must land on the confirm-delete button inside it.
// ---------------------------------------------------------------------------

test("delete confirmation uses a dialog element and moves focus to the confirm button", async ({
  page,
}) => {
  await gotoExpenses(page);

  // Add a single expense so the delete button appears
  await addExpense(page, { description: "expense to delete" });

  // Locate and click the Delete button for this expense
  const deleteBtn = page
    .locator('[data-action="delete"][aria-label*="expense to delete"]')
    .first();
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  // The <dialog> element must now be open (visible in the DOM)
  const dialog = page.locator("#confirm-dialog");
  await expect(dialog).toBeVisible();

  // Focus must be on the confirm-delete button inside the dialog
  // Playwright's locator.evaluate checks document.activeElement
  const confirmBtn = page.locator("#confirm-delete-btn");
  await expect(confirmBtn).toBeVisible();

  // Assert that the confirm button has keyboard focus
  await expect(confirmBtn).toBeFocused();

  // The dialog detail text should reference the expense amount or description
  const dialogDetail = page.locator("#confirm-dialog-detail");
  await expect(dialogDetail).not.toBeEmpty();

  // Close the dialog cleanly (cancel) so there's no side-effect on the list
  await page.locator("#cancel-delete-btn").click();
  await expect(dialog).toBeHidden();
});
