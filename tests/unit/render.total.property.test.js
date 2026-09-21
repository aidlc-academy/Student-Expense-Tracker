/**
 * Property-based tests for render.js — calcTotal
 *
 * Feature: student-expense-tracker, Property 8: Total amount equals sum of visible expenses
 *
 * Validates: Requirements 5.4, 6.4, 7.2, 7.3
 */

// Feature: student-expense-tracker, Property 8: Total amount equals sum of visible expenses

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import { calcTotal } from "../../js/render.js";

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
 * Generates a single Expense object with an amount already rounded to 2 d.p.,
 * matching how model.js stores amounts.
 */
const expenseArb = fc.record({
  id: fc.uuid(),
  // Amounts rounded to 2 d.p.: generate integer cents then divide
  amount: fc
    .integer({ min: 1, max: 99999999 })
    .map((cents) => Math.round(cents) / 100),
  category: fc.constantFrom(...CATEGORIES),
  description: fc.string({ minLength: 0, maxLength: 250 }),
  date: isoDateArb,
  createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

/** Generates arrays of 0–20 expenses (includes empty set). */
const expenseArrayArb = fc.array(expenseArb, { minLength: 0, maxLength: 20 });

/** Generates non-empty arrays of 1–20 expenses. */
const nonEmptyExpenseArrayArb = fc.array(expenseArb, { minLength: 1, maxLength: 20 });

// ---------------------------------------------------------------------------
// Helper: reference implementation for the expected total
// Accumulates in integer cents to avoid floating-point drift — mirrors calcTotal.
// ---------------------------------------------------------------------------
function expectedTotal(expenses) {
  if (!expenses || expenses.length === 0) return 0;
  const totalCents = expenses.reduce(
    (sum, e) => sum + Math.round(e.amount * 100),
    0
  );
  return Math.round(totalCents) / 100;
}

// ---------------------------------------------------------------------------
// Property 8: Total amount equals sum of visible expenses
// ---------------------------------------------------------------------------

describe("render.js — Property 8: Total amount equals sum of visible expenses", () => {

  it(
    "calcTotal result equals Math.round(sum * 100) / 100 of all amounts for any expense set (Req 7.2, 7.3)",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, (expenses) => {
          const result = calcTotal(expenses);
          const expected = expectedTotal(expenses);
          expect(result).toBe(expected);
        }),
        { numRuns: 100, verbose: true }
      );
    }
  );

  it(
    "calcTotal returns 0 for an empty array (Req 7.3)",
    () => {
      expect(calcTotal([])).toBe(0);
    }
  );

  it(
    "calcTotal returns 0 for null/undefined input (Req 7.3)",
    () => {
      expect(calcTotal(null)).toBe(0);
      expect(calcTotal(undefined)).toBe(0);
    }
  );

  it(
    "calcTotal result has at most 2 decimal places for any expense set (Req 5.4, 6.4)",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, (expenses) => {
          const result = calcTotal(expenses);
          // Check that rounding to 2 d.p. produces the same value
          expect(result).toBe(Math.round(result * 100) / 100);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "calcTotal result is always >= 0 for positive amounts (Req 5.4, 6.4)",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, (expenses) => {
          const result = calcTotal(expenses);
          expect(result).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "calcTotal of a subset is <= calcTotal of the full set (monotonicity, Req 5.4)",
    () => {
      fc.assert(
        fc.property(nonEmptyExpenseArrayArb, (expenses) => {
          // Pick a random prefix as the "visible" subset
          const splitAt = Math.floor(expenses.length / 2);
          const subset = expenses.slice(0, splitAt);

          const fullTotal = calcTotal(expenses);
          const subsetTotal = calcTotal(subset);

          // Since all amounts are positive, subset total <= full total
          expect(subsetTotal).toBeLessThanOrEqual(fullTotal + Number.EPSILON);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "calcTotal of a single expense equals its amount rounded to 2 d.p.",
    () => {
      fc.assert(
        fc.property(expenseArb, (expense) => {
          const result = calcTotal([expense]);
          const expected = Math.round(expense.amount * 100) / 100;
          expect(result).toBe(expected);
        }),
        { numRuns: 100 }
      );
    }
  );
});
