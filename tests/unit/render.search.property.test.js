/**
 * Property-based tests for render.js — Property 6
 *
 * Feature: student-expense-tracker, Property 6: Search filter correctness — all visible expenses contain the search term
 *
 * Validates: Requirements 6.2, 6.3
 */

// Feature: student-expense-tracker, Property 6: Search filter correctness — all visible expenses contain the search term

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// No DOM or localStorage required — getVisibleExpenses is a pure function
// ---------------------------------------------------------------------------

const { getVisibleExpenses } = await import("../../js/render.js");

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Other"];

/**
 * Generates a plain Expense-shaped object. Description is printable ASCII so
 * that case-insensitive substring matching behaves predictably.
 */
const expenseArb = fc.record({
  id: fc.uuid(),
  amount: fc.integer({ min: 1, max: 99999999 }).map((c) => Math.round(c) / 100),
  category: fc.constantFrom(...CATEGORIES),
  description: fc.string({ minLength: 0, maxLength: 100, unit: "grapheme-ascii" }),
  date: fc.constant("2024-06-01"),
  createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

/**
 * Generates a non-empty search term made of printable ASCII characters (1–20
 * chars). Keeping it short increases the chance of natural matches without
 * needing to inject the term into descriptions.
 */
const searchTermArb = fc.string({ minLength: 1, maxLength: 20, unit: "grapheme-ascii" });

/**
 * Generates an expense whose description is guaranteed to contain `term`
 * (case-preserved — case-insensitive matching in getVisibleExpenses will still
 * match because both sides are lowercased).
 */
function matchingExpenseArb(term) {
  return fc.record({
    id: fc.uuid(),
    amount: fc.integer({ min: 1, max: 99999999 }).map((c) => Math.round(c) / 100),
    category: fc.constantFrom(...CATEGORIES),
    // Embed the term verbatim somewhere in the description
    description: fc
      .tuple(
        fc.string({ minLength: 0, maxLength: 50, unit: "grapheme-ascii" }),
        fc.string({ minLength: 0, maxLength: 50, unit: "grapheme-ascii" })
      )
      .map(([pre, post]) => `${pre}${term}${post}`),
    date: fc.constant("2024-06-01"),
    createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
    lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  });
}

// ---------------------------------------------------------------------------
// Property 6: Search filter correctness — all visible expenses contain the search term
// ---------------------------------------------------------------------------

describe("render.js — Property 6: Search filter correctness — all visible expenses contain the search term", () => {
  /**
   * P6-a: Every expense returned by getVisibleExpenses contains the search
   * term in its description (case-insensitive). Validates Requirement 6.2.
   *
   * We generate a random expense list plus a random non-empty search term.
   * After filtering, every returned expense must contain the term.
   */
  it(
    "every visible expense description contains the search term (case-insensitive) — Req 6.2",
    () => {
      fc.assert(
        fc.property(
          fc.array(expenseArb, { minLength: 0, maxLength: 20 }),
          searchTermArb,
          (expenses, term) => {
            const state = { expenses, filter: "All", search: term };
            const visible = getVisibleExpenses(state);

            // getVisibleExpenses trims the search term before matching
            const lowerTerm = term.trim().toLowerCase();

            // If the term is all whitespace, it becomes empty → no filtering
            // (all expenses visible), so the containment check is vacuously
            // satisfied (every description "contains" the empty string).
            for (const expense of visible) {
              expect(expense.description.toLowerCase()).toContain(lowerTerm);
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  /**
   * P6-b: No expense whose description does NOT contain the search term
   * appears in the results. Validates Requirement 6.3 (non-matching expenses
   * are excluded).
   *
   * Note: getVisibleExpenses trims the search term before matching, so we
   * also trim here to align with the implementation. A whitespace-only term
   * becomes empty after trimming and therefore returns all expenses — that
   * case is intentionally skipped via fc.pre().
   */
  it(
    "no expense whose description does not contain the search term appears in results — Req 6.3",
    () => {
      fc.assert(
        fc.property(
          fc.array(expenseArb, { minLength: 0, maxLength: 20 }),
          searchTermArb,
          (expenses, term) => {
            // Skip whitespace-only terms — they are treated as empty searches
            // (all expenses returned), which is tested separately in P6-e.
            fc.pre(term.trim() !== "");

            const state = { expenses, filter: "All", search: term };
            const visible = getVisibleExpenses(state);

            // Use the trimmed, lowercased form that getVisibleExpenses uses
            const lowerTerm = term.trim().toLowerCase();
            const visibleIds = new Set(visible.map((e) => e.id));

            // Every expense NOT in visible must NOT contain the term
            for (const expense of expenses) {
              if (!expense.description.toLowerCase().includes(lowerTerm)) {
                expect(visibleIds.has(expense.id)).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  /**
   * P6-c: Matching expenses are never excluded. When a description DOES
   * contain the search term, that expense must appear in the results
   * (assuming no category filter is restricting it). Validates Req 6.2.
   *
   * We generate some expenses that contain the term and mix them with
   * arbitrary expenses that may or may not match.
   */
  it(
    "every expense whose description contains the search term is included in results",
    () => {
      fc.assert(
        fc.property(
          searchTermArb,
          fc.array(expenseArb, { minLength: 0, maxLength: 10 }),
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 5 }).chain(
            (counts) =>
              fc.tuple(...counts.map(() => fc.constant(null))).chain(() =>
                searchTermArb.chain((term) =>
                  fc.tuple(
                    fc.constant(term),
                    fc.array(matchingExpenseArb(term), { minLength: 1, maxLength: 5 })
                  )
                )
              )
          ),
          // Restructure: use the first searchTermArb as our term
          (term, nonMatchingExpenses, [_ignored, matchingExpenses]) => {
            // Mix matching and non-matching expenses
            const allExpenses = [...matchingExpenses, ...nonMatchingExpenses];
            const state = { expenses: allExpenses, filter: "All", search: term };
            const visible = getVisibleExpenses(state);

            // Use the trimmed form so this aligns with getVisibleExpenses behaviour
            const lowerTerm = term.trim().toLowerCase();
            const visibleIds = new Set(visible.map((e) => e.id));

            // Every expense that contains the term must be visible
            for (const expense of allExpenses) {
              if (expense.description.toLowerCase().includes(lowerTerm)) {
                expect(visibleIds.has(expense.id)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  /**
   * P6-d: Empty search returns all expenses (Req 6.3).
   */
  it(
    "empty search term returns all expenses regardless of description",
    () => {
      fc.assert(
        fc.property(
          fc.array(expenseArb, { minLength: 0, maxLength: 20 }),
          (expenses) => {
            const state = { expenses, filter: "All", search: "" };
            const visible = getVisibleExpenses(state);
            expect(visible).toHaveLength(expenses.length);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );

  /**
   * P6-e: Whitespace-only search term is treated as empty — all expenses
   * are visible. Validates the trim logic in getVisibleExpenses.
   */
  it(
    "whitespace-only search term is treated as empty — all expenses are returned",
    () => {
      fc.assert(
        fc.property(
          fc.array(expenseArb, { minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }).map((s) => s.replace(/\S/g, " ")), // all spaces
          (expenses, whitespaceSearch) => {
            // Only run if the generated string is actually all whitespace
            fc.pre(whitespaceSearch.trim() === "");

            const state = { expenses, filter: "All", search: whitespaceSearch };
            const visible = getVisibleExpenses(state);
            expect(visible).toHaveLength(expenses.length);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    }
  );
});
