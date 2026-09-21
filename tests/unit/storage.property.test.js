/**
 * Property-based tests for storage.js
 *
 * Feature: student-expense-tracker, Property 1: Serialisation round-trip preserves all fields
 *
 * Validates: Requirements 10.5
 */

// Feature: student-expense-tracker, Property 1: Serialisation round-trip preserves all fields

import { describe, it, expect, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Mock localStorage with an in-memory object before importing the module.
// storage.js reads from the global `localStorage`, so we inject a mock on
// `globalThis` before any test runs.
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

// Inject mock into globalThis so storage.js can access `localStorage`
globalThis.localStorage = localStorageMock;

// Also provide a minimal `document` so the storage:error event dispatch in
// storage.js doesn't throw when we deliberately trigger it in other tests.
if (!globalThis.document) {
  globalThis.document = {
    dispatchEvent() {},
  };
}

// Import after setting up the mock
const { saveExpenses, loadExpenses } = await import(
  "../../js/storage.js"
);

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Other"];

/**
 * Generates a valid ISO "YYYY-MM-DD" date string within a reasonable range
 * (year 2000 – 2099) so that JSON round-trip doesn't alter the string.
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
 * Generates a single Expense object whose fields survive JSON round-trip:
 * - id: non-empty string (UUID-like)
 * - amount: float with exactly 2 d.p. in the valid range
 * - category: one of the six predefined categories
 * - description: string, 0–250 characters
 * - date: "YYYY-MM-DD" string
 * - createdAt / lastModified: safe integers (so JSON.stringify is exact)
 */
const expenseArb = fc.record({
  id: fc.uuid(),
  amount: fc
    .integer({ min: 1, max: 99999999 })   // cents, 0.01–999,999.99
    .map((cents) => Math.round(cents) / 100),
  category: fc.constantFrom(...CATEGORIES),
  description: fc.string({ minLength: 0, maxLength: 250 }),
  date: isoDateArb,
  createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

/** Generates arrays of 0–20 expenses */
const expenseArrayArb = fc.array(expenseArb, { minLength: 0, maxLength: 20 });

// ---------------------------------------------------------------------------
// Property 1: Serialisation round-trip preserves all fields
// ---------------------------------------------------------------------------

describe("storage.js — Property 1: Serialisation round-trip preserves all fields", () => {
  beforeEach(() => {
    // Reset the in-memory store before each test run
    store = {};
  });

  it(
    "saveExpenses then loadExpenses returns objects with identical id, amount, category, description, and date",
    () => {
      fc.assert(
        fc.property(expenseArrayArb, (expenses) => {
          // Arrange: clear store, write expenses
          store = {};
          saveExpenses(expenses);

          // Act: read them back
          const loaded = loadExpenses();

          // Assert: same length
          expect(loaded).toHaveLength(expenses.length);

          // Assert: each object has identical required field values
          for (let i = 0; i < expenses.length; i++) {
            expect(loaded[i].id).toBe(expenses[i].id);
            expect(loaded[i].amount).toBe(expenses[i].amount);
            expect(loaded[i].category).toBe(expenses[i].category);
            expect(loaded[i].description).toBe(expenses[i].description);
            expect(loaded[i].date).toBe(expenses[i].date);
          }
        }),
        {
          // Minimum 100 iterations as required by the spec
          numRuns: 100,
          verbose: true,
        }
      );
    }
  );

  it("round-trip preserves order of expenses in the array", () => {
    fc.assert(
      fc.property(expenseArrayArb, (expenses) => {
        store = {};
        saveExpenses(expenses);
        const loaded = loadExpenses();

        // Order must be preserved
        for (let i = 0; i < expenses.length; i++) {
          expect(loaded[i].id).toBe(expenses[i].id);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("round-trip on an empty array returns an empty array", () => {
    store = {};
    saveExpenses([]);
    const loaded = loadExpenses();
    expect(loaded).toEqual([]);
  });
});
