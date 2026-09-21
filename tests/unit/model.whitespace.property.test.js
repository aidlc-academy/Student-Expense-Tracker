/**
 * Property-based tests for model.js — whitespace description handling
 *
 * Feature: student-expense-tracker, Property 3: Whitespace-only and empty descriptions are treated as empty
 *
 * Validates: Requirements 1.1, 1.3
 */

// Feature: student-expense-tracker, Property 3: Whitespace-only and empty descriptions are treated as empty

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";

// Provide crypto.randomUUID for the Node environment (available in Node 15+;
// this guard keeps things safe across versions).
if (!globalThis.crypto) {
  const { webcrypto } = await import("node:crypto");
  globalThis.crypto = webcrypto;
}

const { CATEGORIES, validateExpenseFields, createExpense } = await import(
  "../../js/model.js"
);

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates whitespace-only strings from the four whitespace characters
 * allowed by the spec: space, tab, newline, carriage return.
 * minLength: 0 covers the empty string case too.
 */
const whitespaceDescriptionArb = fc.stringOf(
  fc.constantFrom(" ", "\t", "\n", "\r"),
  { minLength: 0, maxLength: 300 }
);

/**
 * Generates a valid amount in the range [0.01, 999999.99] with up to 2 d.p.
 * We work in integer cents to avoid floating-point construction issues.
 */
const validAmountArb = fc
  .integer({ min: 1, max: 99999999 }) // cents: 0.01 – 999,999.99
  .map((cents) => cents / 100);

/**
 * Generates a valid ISO "YYYY-MM-DD" date string that is today or in the
 * past, so we never accidentally exceed the 365-day future limit.
 */
const validPastDateArb = fc
  .integer({ min: 0, max: 365 * 10 }) // up to ~10 years in the past
  .map((daysAgo) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

/** Generates a category from the predefined list. */
const validCategoryArb = fc.constantFrom(...CATEGORIES);

// ---------------------------------------------------------------------------
// Property 3: Whitespace-only and empty descriptions are treated as empty
// ---------------------------------------------------------------------------

describe("model.js — Property 3: Whitespace-only and empty descriptions are treated as empty", () => {
  it(
    "validateExpenseFields with whitespace-only description returns valid: true and no description error",
    () => {
      fc.assert(
        fc.property(
          whitespaceDescriptionArb,
          validAmountArb,
          validCategoryArb,
          validPastDateArb,
          (description, amount, category, date) => {
            const result = validateExpenseFields({
              amount,
              category,
              description,
              date,
            });

            // The submission must succeed — whitespace is not a validation error
            expect(result.valid).toBe(true);
            expect(result.errors.description).toBeUndefined();
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it(
    "createExpense with whitespace-only description stores an empty string after trimming",
    () => {
      fc.assert(
        fc.property(
          whitespaceDescriptionArb,
          validAmountArb,
          validCategoryArb,
          validPastDateArb,
          (description, amount, category, date) => {
            const expense = createExpense({ amount, category, description, date });

            // The stored description must be the trimmed value — always "" for
            // whitespace-only or empty inputs
            expect(expense.description).toBe(description.trim());
            expect(expense.description).toBe("");
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
