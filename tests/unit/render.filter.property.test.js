/**
 * Property-based tests for render.js — filter correctness
 *
 * Feature: student-expense-tracker, Property 5: Filter correctness — all visible expenses match the selected category
 *
 * Validates: Requirements 5.2, 5.3
 */

// Feature: student-expense-tracker, Property 5: Filter correctness — all visible expenses match the selected category

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";

const { getVisibleExpenses } = await import("../../js/render.js");

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Other"];

/**
 * Generates a valid ISO "YYYY-MM-DD" date string within a safe range.
 */
const isoDateArb = fc.date({
  min: new Date("2000-01-01"),
  max: new Date("2099-12-31"),
}).map((d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
});

/**
 * Generates a single Expense object with all required fields.
 * Category is chosen from the predefined CATEGORIES list.
 */
const expenseArb = fc.record({
  id: fc.uuid(),
  amount: fc
    .integer({ min: 1, max: 99999999 })
    .map((cents) => Math.round(cents) / 100),
  category: fc.constantFrom(...CATEGORIES),
  description: fc.string({ minLength: 0, maxLength: 250 }),
  date: isoDateArb,
  createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

/** Generates arrays of 0–20 expenses with any mix of categories. */
const expenseArrayArb = fc.array(expenseArb, { minLength: 0, maxLength: 20 });

/** Generates a random category from the predefined list. */
const categoryArb = fc.constantFrom(...CATEGORIES);

// ---------------------------------------------------------------------------
// Property 5: Filter correctness — all visible expenses match the selected category
// ---------------------------------------------------------------------------

describe("render.js — Property 5: Filter correctness — all visible expenses match the selected category", () => {

  it(
    "when a specific category is selected, every returned expense has that exact category (Req 5.2)",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, categoryArb, (expenses, selectedCategory) => {
          const state = { expenses, filter: selectedCategory, search: "" };
          const visible = getVisibleExpenses(state);

          // Every returned expense must have category === selectedCategory
          for (const expense of visible) {
            expect(expense.category).toBe(selectedCategory);
          }
        }),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "when a specific category is selected, no expense with a different category appears (Req 5.2, 5.3)",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, categoryArb, (expenses, selectedCategory) => {
          const state = { expenses, filter: selectedCategory, search: "" };
          const visible = getVisibleExpenses(state);
          const visibleIds = new Set(visible.map((e) => e.id));

          // No expense with a different category should be in the visible set
          const wrongCategory = expenses.filter(
            (e) => e.category !== selectedCategory
          );
          for (const expense of wrongCategory) {
            expect(visibleIds.has(expense.id)).toBe(false);
          }
        }),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "when filter is 'All', all expenses are returned regardless of category (Req 5.3)",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, (expenses) => {
          const state = { expenses, filter: "All", search: "" };
          const visible = getVisibleExpenses(state);

          // All expenses should be visible
          expect(visible).toHaveLength(expenses.length);

          // Every original expense should appear in the result
          const visibleIds = new Set(visible.map((e) => e.id));
          for (const expense of expenses) {
            expect(visibleIds.has(expense.id)).toBe(true);
          }
        }),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "visible count never exceeds total count when a specific category is active",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, categoryArb, (expenses, selectedCategory) => {
          const state = { expenses, filter: selectedCategory, search: "" };
          const visible = getVisibleExpenses(state);

          expect(visible.length).toBeLessThanOrEqual(expenses.length);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "visible count equals the number of expenses with that category in the full list",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, categoryArb, (expenses, selectedCategory) => {
          const state = { expenses, filter: selectedCategory, search: "" };
          const visible = getVisibleExpenses(state);

          const expected = expenses.filter(
            (e) => e.category === selectedCategory
          ).length;

          expect(visible.length).toBe(expected);
        }),
        { numRuns: 100, verbose: true }
      );
    }
  );
});
