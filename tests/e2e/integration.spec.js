/**
 * integration.spec.js — Playwright integration tests
 *
 * Tests: edit, delete, filter, and search flows.
 * Requirements: 3.1–3.3, 4.1–4.3, 5.1–5.4, 6.1–6.4
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the expense list view (#expenses) with a clean localStorage.
 * Always starts from a blank slate so tests are fully independent.
 */
async function gotoExpenses(page) {
  // Clear localStorage before the page script runs so the app boots with no data
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto("/#expenses");
  // Wait for the expense section to be visible before interacting
  await expect(page.locator("#expenses")).toBeVisible();
}

/**
 * Fill and submit the expense entry form.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ amount: string, category: string, date: string, description?: string }} fields
 */
async function addExpense(page, { amount, category, date, description = "" }) {
  await page.locator("#amount-input").fill(amount);
  await page.locator("#category-input").selectOption(category);
  await page.locator("#date-input").fill(date);
  if (description) {
    await page.locator("#description-input").fill(description);
  }
  await page.locator("#save-btn").click();
  // Wait until the form resets (amount field cleared) — confirms successful save
  await expect(page.locator("#amount-input")).toHaveValue("");
}

// ---------------------------------------------------------------------------
// 1. Edit flow
//    Add two expenses → Edit the first one → modify amount → Save
//    → assert the updated amount is shown in the list
// ---------------------------------------------------------------------------

test("edit flow: modifying an expense amount reflects the updated value in the list", async ({
  page,
}) => {
  await gotoExpenses(page);

  const today = new Date().toISOString().slice(0, 10);

  // Add expense A
  await addExpense(page, {
    amount: "50.00",
    category: "Food",
    date: today,
    description: "expense A",
  });

  // Add expense B
  await addExpense(page, {
    amount: "30.00",
    category: "Transport",
    date: today,
    description: "expense B",
  });

  // The expense list should now contain two entries.
  // Click the Edit button for expense A (description "expense A").
  const editBtn = page
    .locator('[data-action="edit"][aria-label*="expense A"]')
    .first();
  await editBtn.click();

  // The form should switch to edit mode — title should read "Edit Expense"
  await expect(page.locator("#form-title")).toHaveText("Edit Expense");
  // The amount field should be pre-populated with the original amount
  await expect(page.locator("#amount-input")).toHaveValue("50");

  // Modify the amount
  await page.locator("#amount-input").fill("75.50");
  await page.locator("#save-btn").click();

  // Wait for form to reset (edit mode exited)
  await expect(page.locator("#form-title")).toHaveText("Add Expense");

  // The updated amount must now appear in the expense list
  await expect(page.locator("#expense-list")).toContainText("₹ 75.50");
  // The old amount should no longer appear for that expense row
  // (note: ₹ 30.00 from expense B must still be present)
  await expect(page.locator("#expense-list")).toContainText("₹ 30.00");

  // Confirm the original ₹ 50.00 is gone
  const rows = page.locator("#expense-list").getByText("₹ 50.00");
  await expect(rows).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 2. Delete flow
//    Add an expense → click Delete → confirm in dialog
//    → assert expense is removed from the list
// ---------------------------------------------------------------------------

test("delete flow: confirming deletion removes the expense from the list", async ({
  page,
}) => {
  await gotoExpenses(page);

  const today = new Date().toISOString().slice(0, 10);

  await addExpense(page, {
    amount: "120.00",
    category: "Books",
    date: today,
    description: "textbook to delete",
  });

  // Verify the expense is present
  await expect(page.locator("#expense-list")).toContainText("textbook to delete");

  // Click Delete for this expense
  const deleteBtn = page
    .locator('[data-action="delete"][aria-label*="textbook to delete"]')
    .first();
  await deleteBtn.click();

  // The confirmation dialog should appear
  const dialog = page.locator("#confirm-dialog");
  await expect(dialog).toBeVisible();
  // Dialog detail should reference the expense
  await expect(page.locator("#confirm-dialog-detail")).toContainText("120.00");

  // Confirm the deletion
  await page.locator("#confirm-delete-btn").click();

  // Dialog must close
  await expect(dialog).toBeHidden();

  // The expense must no longer appear in the list
  await expect(page.locator("#expense-list")).not.toContainText("textbook to delete");

  // A toast confirming the action should appear
  await expect(page.locator("#toast")).toContainText("deleted");
});

// ---------------------------------------------------------------------------
// 3. Filter flow
//    Add a Food expense and a Transport expense → select "Food" from the filter
//    → assert only the Food expense is shown and the total reflects only Food
// ---------------------------------------------------------------------------

test("filter flow: selecting a category shows only matching expenses and updates the total", async ({
  page,
}) => {
  await gotoExpenses(page);

  const today = new Date().toISOString().slice(0, 10);

  // Add a Food expense
  await addExpense(page, {
    amount: "40.00",
    category: "Food",
    date: today,
    description: "lunch",
  });

  // Add a Transport expense
  await addExpense(page, {
    amount: "15.00",
    category: "Transport",
    date: today,
    description: "bus ticket",
  });

  // Both should be visible initially (All filter)
  await expect(page.locator("#expense-list")).toContainText("lunch");
  await expect(page.locator("#expense-list")).toContainText("bus ticket");

  // Select "Food" from the category filter
  await page.locator("#category-filter").selectOption("Food");

  // Only the Food expense should remain visible
  await expect(page.locator("#expense-list")).toContainText("lunch");
  await expect(page.locator("#expense-list")).not.toContainText("bus ticket");

  // Total should reflect only the Food expense amount
  await expect(page.locator("#list-total")).toContainText("40.00");
  await expect(page.locator("#list-total")).not.toContainText("55.00");
});

// ---------------------------------------------------------------------------
// 4. Search flow
//    Add "coffee at cafe" and "textbook purchase" → type "coffee" in search
//    → assert only the coffee expense appears within 300 ms
// ---------------------------------------------------------------------------

test("search flow: typing in the search box filters expenses by description within 300 ms", async ({
  page,
}) => {
  await gotoExpenses(page);

  const today = new Date().toISOString().slice(0, 10);

  // Add expense with description that will match the search
  await addExpense(page, {
    amount: "60.00",
    category: "Food",
    date: today,
    description: "coffee at cafe",
  });

  // Add expense whose description will NOT match
  await addExpense(page, {
    amount: "500.00",
    category: "Books",
    date: today,
    description: "textbook purchase",
  });

  // Verify both are visible before searching
  await expect(page.locator("#expense-list")).toContainText("coffee at cafe");
  await expect(page.locator("#expense-list")).toContainText("textbook purchase");

  // Record the time before typing and assert the list updates within 300 ms
  const start = Date.now();

  await page.locator("#search-input").fill("coffee");

  // The debounce is 16 ms; Playwright's expect retries for up to the default
  // timeout but we assert it resolves well within 300 ms by using a short
  // dedicated timeout for the assertion.
  await expect(page.locator("#expense-list")).not.toContainText("textbook purchase", {
    timeout: 300,
  });
  await expect(page.locator("#expense-list")).toContainText("coffee at cafe", {
    timeout: 300,
  });

  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(300);
});
