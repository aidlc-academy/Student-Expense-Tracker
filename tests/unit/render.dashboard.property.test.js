/**
 * Property-based tests for render.js — Property 10
 *
 * Feature: student-expense-tracker, Property 10: Dashboard shows the five most recently modified expenses
 *
 * Validates: Requirements 8.3, 8.4
 */

// Feature: student-expense-tracker, Property 10: Dashboard shows the five most recently modified expenses

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Import the function under test
// ---------------------------------------------------------------------------

const { sortDashboardRecent } = await import("../../js/render.js");

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Other"];

/**
 * Generates a single expense-like object. We only need lastModified and id
 * to exercise sortDashboardRecent, but we include all standard fields for
 * realism.
 */
const expenseArb = fc.record({
  id: fc.uuid(),
  amount: fc
    .integer({ min: 1, max: 99999999 })
    .map((cents) => Math.round(cents) / 100),
  category: fc.constantFrom(...CATEGORIES),
  description: fc.string({ minLength: 0, maxLength: 50, unit: "grapheme-ascii" }),
  date: fc.constant("2024-01-01"), // date is irrelevant to this sort
  createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

/**
 * Generates arrays of at least 5 expenses (up to 20).
 * Requirement 8.3/8.4 only mandates top-5 behaviour when ≥5 expenses exist.
 */
const atLeastFiveExpensesArb = fc.array(expenseArb, {
  minLength: 5,
  maxLength: 20,
});

// ---------------------------------------------------------------------------
// Helper — derive the expected top-5 from an expense array
// ---------------------------------------------------------------------------

/**
 * Mirror the sort logic from sortDashboardRecent so we can independently
 * compute the expected result and compare it to the function under test.
 *
 * Sort by lastModified descending; ties broken by id descending (lexicographic).
 * Return the top 5.
 */
function expectedTop5(expenses) {
  return [...expenses]
    .sort((a, b) => {
      if (b.lastModified !== a.lastModified) {
        return b.lastModified - a.lastModified;
      }
      if (a.id < b.id) return 1;
      if (a.id > b.id) return -1;
      return 0;
    })
    .slice(0, 5);
}

// ---------------------------------------------------------------------------
// Property 10: Dashboard shows the five most recently modified expenses
// ---------------------------------------------------------------------------

describe("render.js — Property 10: Dashboard shows the five most recently modified expenses", () => {

  it(
    "sortDashboardRecent always returns exactly 5 expenses when the input has ≥ 5",
    () => {
      fc.assert(
        fc.property(atLeastFiveExpensesArb, (expenses) => {
          const result = sortDashboardRecent(expenses);
          expect(result).toHaveLength(5);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it(
    "sortDashboardRecent returns the 5 expenses with the largest lastModified values",
    () => {
      fc.assert(
        fc.property(atLeastFiveExpensesArb, (expenses) => {
          const result = sortDashboardRecent(expenses);
          const expected = expectedTop5(expenses);

          // The result must contain the same 5 ids as the independently-derived top-5
          const resultIds = result.map((e) => e.id);
          const expectedIds = expected.map((e) => e.id);

          expect(resultIds).toEqual(expectedIds);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it(
    "sortDashboardRecent orders the result by lastModified descending",
    () => {
      fc.assert(
        fc.property(atLeastFiveExpensesArb, (expenses) => {
          const result = sortDashboardRecent(expenses);

          for (let i = 0; i < result.length - 1; i++) {
            // Each element's lastModified must be >= the next element's
            expect(result[i].lastModified).toBeGreaterThanOrEqual(
              result[i + 1].lastModified
            );

            // When lastModified values are equal, id must be in descending lexicographic order
            if (result[i].lastModified === result[i + 1].lastModified) {
              expect(result[i].id >= result[i + 1].id).toBe(true);
            }
          }
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it(
    "sortDashboardRecent does not mutate the original array",
    () => {
      fc.assert(
        fc.property(atLeastFiveExpensesArb, (expenses) => {
          const originalIds = expenses.map((e) => e.id);
          sortDashboardRecent(expenses);
          // Original array order must be unchanged
          expect(expenses.map((e) => e.id)).toEqual(originalIds);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it(
    "when all lastModified values are equal, the 5 expenses with lexicographically largest ids are returned",
    () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              amount: fc.constant(1.00),
              category: fc.constant("Food"),
              description: fc.constant(""),
              date: fc.constant("2024-01-01"),
              createdAt: fc.constant(0),
              // Fix lastModified so all expenses tie on this field
              lastModified: fc.constant(1000),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (expenses) => {
            const result = sortDashboardRecent(expenses);
            const expected = expectedTop5(expenses);

            const resultIds = result.map((e) => e.id);
            const expectedIds = expected.map((e) => e.id);

            expect(resultIds).toEqual(expectedIds);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );
});
