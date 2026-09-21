/**
 * Property-based tests for state.js — Property 2
 *
 * Feature: student-expense-tracker, Property 2: Valid expense submission grows the expense list by exactly one
 *
 * Validates: Requirements 1.2
 */

// Feature: student-expense-tracker, Property 2: Valid expense submission grows the expense list by exactly one

import { describe, it, expect, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// In-memory localStorage mock — must be in place before any module imports
// ---------------------------------------------------------------------------

let store = {};

const localStorageMock = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key, value) {
    store[key] = String(value);
  },
  removeItem(key) {
    delete store[key];
  },
  clear() {
    store = {};
  },
};

globalThis.localStorage = localStorageMock;

// Minimal document mock so storage.js can dispatch custom events without error
if (!globalThis.document) {
  globalThis.document = { dispatchEvent() {} };
}

// Node 19+ exposes crypto globally, but older versions may not — ensure availability
if (!globalThis.crypto) {
  const { webcrypto } = await import("node:crypto");
  globalThis.crypto = webcrypto;
}

// ---------------------------------------------------------------------------
// Import modules under test
// ---------------------------------------------------------------------------

const { initState, getState, addExpense } = await import("../../js/state.js");
const { CATEGORIES } = await import("../../js/model.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "student-expense-tracker:expenses";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates an ISO "YYYY-MM-DD" date string that is at or before today
 * (so it always passes the ≤365 days future constraint) and no earlier
 * than 2000-01-01.
 */
const validDateArb = fc.date({
  min: new Date("2000-01-01"),
  // Use today as the upper bound — dates in the past are always valid
  max: new Date(),
}).map((d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
});

/**
 * Generates a valid amount string: a number in [0.01, 999999.99] rounded to
 * 2 decimal places.
 */
const validAmountArb = fc
  .integer({ min: 1, max: 99999999 }) // cents: 0.01 → 999,999.99
  .map((cents) => String(Math.round(cents) / 100));

/**
 * Generates a valid description: trimmed length 0–250 characters.
 * We use plain ASCII to keep tests straightforward and fast.
 */
const validDescriptionArb = fc.string({
  minLength: 0,
  maxLength: 250,
  unit: "grapheme-ascii",
});

/**
 * Generates a complete set of valid ExpenseFields.
 */
const validExpenseFieldsArb = fc.record({
  amount: validAmountArb,
  category: fc.constantFrom(...CATEGORIES),
  description: validDescriptionArb,
  date: validDateArb,
});

/**
 * Generates an array of plain expense-like seed objects to pre-populate state.
 * These mimic the shape of Expense objects stored in localStorage.
 * Using 0–10 items keeps test iterations fast.
 */
const seedExpenseArb = fc.record({
  id: fc.uuid(),
  amount: fc.integer({ min: 1, max: 99999999 }).map((c) => Math.round(c) / 100),
  category: fc.constantFrom(...CATEGORIES),
  description: fc.string({ minLength: 0, maxLength: 50, unit: "grapheme-ascii" }),
  date: validDateArb,
  createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

const seedExpenseArrayArb = fc.array(seedExpenseArb, { minLength: 0, maxLength: 10 });

// ---------------------------------------------------------------------------
// Helper — seed state with a given expense array
// ---------------------------------------------------------------------------

/**
 * Resets module state by writing `expenses` to the localStorage mock and
 * calling initState() so the module's private `state` object is refreshed.
 */
function seedState(expenses) {
  store = {};
  localStorageMock.setItem(STORAGE_KEY, JSON.stringify(expenses));
  initState();
}

// ---------------------------------------------------------------------------
// Property 2: Valid expense submission grows the expense list by exactly one
// ---------------------------------------------------------------------------

describe("state.js — Property 2: Valid expense submission grows the expense list by exactly one", () => {
  // Reset to a clean localStorage between each Jest test case (not between fc iterations)
  beforeEach(() => {
    store = {};
    initState();
  });

  it(
    "addExpense with valid fields always increases expense count by exactly 1",
    () => {
      fc.assert(
        fc.property(validExpenseFieldsArb, seedExpenseArrayArb, (fields, seeds) => {
          // Arrange: seed state with the randomly generated existing expenses
          seedState(seeds);
          const initialLength = getState().expenses.length;

          // Act
          const result = addExpense(fields);

          // Assert: addExpense must succeed
          expect(result.success).toBe(true);

          // Assert: list grew by exactly one
          const afterLength = getState().expenses.length;
          expect(afterLength).toBe(initialLength + 1);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it(
    "the newly added expense is present in the list after addExpense",
    () => {
      fc.assert(
        fc.property(validExpenseFieldsArb, seedExpenseArrayArb, (fields, seeds) => {
          // Arrange
          seedState(seeds);

          // Act
          const result = addExpense(fields);
          expect(result.success).toBe(true);

          const expenses = getState().expenses;

          // Assert: at least one expense in the list matches the submitted fields
          const expectedAmount = Math.round(Number(fields.amount) * 100) / 100;
          const expectedDescription = String(fields.description ?? "").trim();

          const found = expenses.some(
            (e) =>
              e.amount === expectedAmount &&
              e.category === fields.category &&
              e.description === expectedDescription &&
              e.date === fields.date
          );

          expect(found).toBe(true);
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it(
    "pre-existing expenses are preserved after addExpense (no data loss)",
    () => {
      fc.assert(
        fc.property(validExpenseFieldsArb, seedExpenseArrayArb, (fields, seeds) => {
          // Arrange
          seedState(seeds);
          const originalIds = new Set(seeds.map((e) => e.id));

          // Act
          addExpense(fields);

          const afterExpenses = getState().expenses;
          const afterIds = new Set(afterExpenses.map((e) => e.id));

          // Assert: every pre-existing id is still present
          for (const id of originalIds) {
            expect(afterIds.has(id)).toBe(true);
          }
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );
});
