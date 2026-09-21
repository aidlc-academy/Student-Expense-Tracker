/**
 * Property-based tests for render.js — Property 7
 *
 * Feature: student-expense-tracker, Property 7: Combined filter and search — conjunction is correctly applied
 *
 * Validates: Requirements 5.5
 */

// Feature: student-expense-tracker, Property 7: Combined filter and search — conjunction is correctly applied

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import { getVisibleExpenses } from "../../js/render.js";
import { CATEGORIES } from "../../js/model.js";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a valid ISO "YYYY-MM-DD" date string in the range 2000–2099.
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
 * Generates a single Expense object whose fields are all well-formed.
 */
const expenseArb = fc.record({
  id: fc.uuid(),
  amount: fc
    .integer({ min: 1, max: 99999999 })
    .map((cents) => Math.round(cents) / 100),
  category: fc.constantFrom(...CATEGORIES),
  description: fc.string({ minLength: 0, maxLength: 250, unit: "grapheme-ascii" }),
  date: isoDateArb,
  createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

/** Generates arrays of 0–30 expenses. */
const expenseArrayArb = fc.array(expenseArb, { minLength: 0, maxLength: 30 });

/**
 * Generates a specific (non-"All") category to use as the active filter.
 */
const categoryFilterArb = fc.constantFrom(...CATEGORIES);

/**
 * Generates a non-empty ASCII search term of 1–20 characters.
 * Constrained to ASCII so lowercase comparisons are unambiguous.
 */
const searchTermArb = fc.string({
  minLength: 1,
  maxLength: 20,
  unit: "grapheme-ascii",
}).filter((s) => s.trim().length > 0);

// ---------------------------------------------------------------------------
// Property 7: Combined filter and search — conjunction is correctly applied
// ---------------------------------------------------------------------------

describe("render.js — Property 7: Combined filter and search — conjunction is correctly applied", () => {
  it(
    "every returned expense satisfies both category filter AND search term simultaneously",
    () => {
      fc.assert(
        fc.property(
          expenseArrayArb,
          categoryFilterArb,
          searchTermArb,
          (expenses, category, search) => {
            const state = { expenses, filter: category, search };
            const visible = getVisibleExpenses(state);

            for (const expense of visible) {
              // Constraint 1: category must exactly match the selected filter
              expect(expense.category).toBe(category);

              // Constraint 2: description must contain the search term (case-insensitive)
              expect(
                expense.description.toLowerCase().includes(search.toLowerCase())
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "no expense that fails either constraint appears in the result",
    () => {
      fc.assert(
        fc.property(
          expenseArrayArb,
          categoryFilterArb,
          searchTermArb,
          (expenses, category, search) => {
            const state = { expenses, filter: category, search };
            const visible = getVisibleExpenses(state);
            const visibleIds = new Set(visible.map((e) => e.id));

            for (const expense of expenses) {
              const categoryMatches = expense.category === category;
              const searchMatches = expense.description
                .toLowerCase()
                .includes(search.toLowerCase());

              // If either constraint fails, the expense must NOT appear
              if (!categoryMatches || !searchMatches) {
                expect(visibleIds.has(expense.id)).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "every expense satisfying both constraints is included in the result",
    () => {
      fc.assert(
        fc.property(
          expenseArrayArb,
          categoryFilterArb,
          searchTermArb,
          (expenses, category, search) => {
            const state = { expenses, filter: category, search };
            const visible = getVisibleExpenses(state);
            const visibleIds = new Set(visible.map((e) => e.id));

            for (const expense of expenses) {
              const categoryMatches = expense.category === category;
              const searchMatches = expense.description
                .toLowerCase()
                .includes(search.toLowerCase());

              // If both constraints pass, the expense MUST appear in results
              if (categoryMatches && searchMatches) {
                expect(visibleIds.has(expense.id)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "result with both constraints is a subset of filtering by category alone",
    () => {
      fc.assert(
        fc.property(
          expenseArrayArb,
          categoryFilterArb,
          searchTermArb,
          (expenses, category, search) => {
            const combined = getVisibleExpenses({ expenses, filter: category, search });
            const categoryOnly = getVisibleExpenses({ expenses, filter: category, search: "" });

            const categoryOnlyIds = new Set(categoryOnly.map((e) => e.id));

            // Every result of the combined filter must also appear in category-only results
            for (const expense of combined) {
              expect(categoryOnlyIds.has(expense.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "result with both constraints is a subset of filtering by search term alone",
    () => {
      fc.assert(
        fc.property(
          expenseArrayArb,
          categoryFilterArb,
          searchTermArb,
          (expenses, category, search) => {
            const combined = getVisibleExpenses({ expenses, filter: category, search });
            const searchOnly = getVisibleExpenses({ expenses, filter: "All", search });

            const searchOnlyIds = new Set(searchOnly.map((e) => e.id));

            // Every result of the combined filter must also appear in search-only results
            for (const expense of combined) {
              expect(searchOnlyIds.has(expense.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );
});
