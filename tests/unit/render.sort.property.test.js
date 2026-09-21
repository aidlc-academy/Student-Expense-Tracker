/**
 * Property-based tests for render.js — sortExpenseList
 *
 * Feature: student-expense-tracker, Property 9: Expense list ordering — date descending, ties broken by createdAt
 *
 * Validates: Requirements 2.2
 */

// Feature: student-expense-tracker, Property 9: Expense list ordering — date descending, ties broken by createdAt

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import { sortExpenseList } from "../../js/render.js";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Other"];

/**
 * Generates a valid ISO "YYYY-MM-DD" date string within a reasonable range
 * (year 2000 – 2099).
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
 * createdAt and lastModified are safe positive integers (Unix ms timestamps).
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

/** Generates arrays of 0–30 expenses */
const expenseArrayArb = fc.array(expenseArb, { minLength: 0, maxLength: 30 });

// ---------------------------------------------------------------------------
// Property 9: Expense list ordering — date descending, ties broken by createdAt
// ---------------------------------------------------------------------------

describe("render.js — Property 9: Expense list ordering — date descending, ties broken by createdAt", () => {
  it(
    "every adjacent pair has date[i] >= date[i+1], and when dates are equal createdAt[i] >= createdAt[i+1]",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, (expenses) => {
          const sorted = sortExpenseList(expenses);

          // The result must have the same length as the input
          expect(sorted).toHaveLength(expenses.length);

          // Check every adjacent pair
          for (let i = 0; i < sorted.length - 1; i++) {
            const curr = sorted[i];
            const next = sorted[i + 1];

            // Primary: date descending (lexicographic ISO string comparison)
            expect(curr.date >= next.date).toBe(true);

            // Secondary: when dates are equal, createdAt descending
            if (curr.date === next.date) {
              expect(curr.createdAt >= next.createdAt).toBe(true);
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

  it("does not mutate the original array", () => {
    fc.assert(
      fc.property(expenseArrayArb, (expenses) => {
        const original = expenses.map((e) => ({ ...e }));
        sortExpenseList(expenses);

        // Length and order of original must be unchanged
        expect(expenses).toHaveLength(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(expenses[i].id).toBe(original[i].id);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("result contains all the same expense ids as the input (no losses or duplicates)", () => {
    fc.assert(
      fc.property(expenseArrayArb, (expenses) => {
        const sorted = sortExpenseList(expenses);

        const inputIds = expenses.map((e) => e.id).sort();
        const outputIds = sorted.map((e) => e.id).sort();

        expect(outputIds).toEqual(inputIds);
      }),
      { numRuns: 100 }
    );
  });

  it("sorting an already-sorted array produces the same order (idempotent)", () => {
    fc.assert(
      fc.property(expenseArrayArb, (expenses) => {
        const once = sortExpenseList(expenses);
        const twice = sortExpenseList(once);

        expect(twice.map((e) => e.id)).toEqual(once.map((e) => e.id));
      }),
      { numRuns: 100 }
    );
  });
});
