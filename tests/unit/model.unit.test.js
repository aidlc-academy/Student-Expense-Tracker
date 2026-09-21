/**
 * model.unit.test.js — Unit tests for model.js
 *
 * Covers:
 *   - validateExpenseFields: one test per validation rule
 *   - createExpense: id uniqueness, timestamps, amount rounding
 *   - updateExpense: id/createdAt preservation, lastModified update, field application
 *
 * Requirements: 1.1–1.6, 3.4, 3.5
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import {
  CATEGORIES,
  validateExpenseFields,
  createExpense,
  updateExpense,
} from "../../js/model.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A set of valid fields — use as a baseline and override individual keys. */
function validFields(overrides = {}) {
  return {
    amount: "25.00",
    category: "Food",
    description: "Lunch",
    date: todayISO(),
    ...overrides,
  };
}

/** Return today's date as YYYY-MM-DD (UTC) */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Return a date N days from today as YYYY-MM-DD (UTC) */
function futureDateISO(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// validateExpenseFields
// ---------------------------------------------------------------------------

describe("validateExpenseFields", () => {
  // --- amount rules ---

  it("returns an error when amount is missing (empty string)", () => {
    const result = validateExpenseFields(validFields({ amount: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it("returns an error when amount is 0 (below minimum 0.01)", () => {
    const result = validateExpenseFields(validFields({ amount: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it("returns an error when amount is 0.001 (below minimum 0.01)", () => {
    const result = validateExpenseFields(validFields({ amount: 0.001 }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it("returns an error when amount is 1,000,000 (above maximum 999,999.99)", () => {
    const result = validateExpenseFields(validFields({ amount: 1_000_000 }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it("accepts amount at the minimum boundary (0.01)", () => {
    const result = validateExpenseFields(validFields({ amount: "0.01" }));
    expect(result.valid).toBe(true);
    expect(result.errors.amount).toBeUndefined();
  });

  it("accepts amount at the maximum boundary (999999.99)", () => {
    const result = validateExpenseFields(validFields({ amount: "999999.99" }));
    expect(result.valid).toBe(true);
    expect(result.errors.amount).toBeUndefined();
  });

  // --- date rules ---

  it("returns an error when date is 366 days in the future", () => {
    const result = validateExpenseFields(validFields({ date: futureDateISO(366) }));
    expect(result.valid).toBe(false);
    expect(result.errors.date).toBeDefined();
  });

  it("accepts a date exactly 365 days in the future", () => {
    const result = validateExpenseFields(validFields({ date: futureDateISO(365) }));
    expect(result.valid).toBe(true);
    expect(result.errors.date).toBeUndefined();
  });

  it("accepts today's date", () => {
    const result = validateExpenseFields(validFields({ date: todayISO() }));
    expect(result.valid).toBe(true);
    expect(result.errors.date).toBeUndefined();
  });

  it("returns an error when date is missing", () => {
    const result = validateExpenseFields(validFields({ date: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.date).toBeDefined();
  });

  // --- description rules ---

  it("returns an error when description is 251 characters (exceeds 250)", () => {
    const longDesc = "a".repeat(251);
    const result = validateExpenseFields(validFields({ description: longDesc }));
    expect(result.valid).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it("accepts a description of exactly 250 characters", () => {
    const maxDesc = "a".repeat(250);
    const result = validateExpenseFields(validFields({ description: maxDesc }));
    expect(result.valid).toBe(true);
    expect(result.errors.description).toBeUndefined();
  });

  it("accepts an empty description (description is optional)", () => {
    const result = validateExpenseFields(validFields({ description: "" }));
    expect(result.valid).toBe(true);
    expect(result.errors.description).toBeUndefined();
  });

  // --- category rules ---

  it("returns an error when category is missing (empty string)", () => {
    const result = validateExpenseFields(validFields({ category: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it("returns an error when category is not one of the predefined values", () => {
    const result = validateExpenseFields(validFields({ category: "Luxury" }));
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it("accepts every valid predefined category", () => {
    for (const cat of CATEGORIES) {
      const result = validateExpenseFields(validFields({ category: cat }));
      expect(result.valid).toBe(true);
      expect(result.errors.category).toBeUndefined();
    }
  });

  // --- multiple errors ---

  it("reports errors for all invalid fields simultaneously", () => {
    const result = validateExpenseFields({
      amount: "",
      category: "",
      description: "",
      date: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
    expect(result.errors.category).toBeDefined();
    expect(result.errors.date).toBeDefined();
  });

  // --- valid full submission ---

  it("returns valid=true and no errors for a fully valid submission", () => {
    const result = validateExpenseFields(validFields());
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// createExpense
// ---------------------------------------------------------------------------

describe("createExpense", () => {
  it("assigns a unique id to each expense", () => {
    const e1 = createExpense(validFields());
    const e2 = createExpense(validFields());
    expect(typeof e1.id).toBe("string");
    expect(e1.id.length).toBeGreaterThan(0);
    expect(e1.id).not.toBe(e2.id);
  });

  it("sets createdAt and lastModified to the same value (approximately now)", () => {
    const before = Date.now();
    const expense = createExpense(validFields());
    const after = Date.now();

    expect(expense.createdAt).toBeGreaterThanOrEqual(before);
    expect(expense.createdAt).toBeLessThanOrEqual(after);
    expect(expense.lastModified).toBe(expense.createdAt);
  });

  it("rounds amount to 2 decimal places", () => {
    const expense = createExpense(validFields({ amount: "10.999" }));
    expect(expense.amount).toBe(11.00);
  });

  it("rounds amount when given a float with many decimals", () => {
    const expense = createExpense(validFields({ amount: "5.555" }));
    // Math.round(5.555 * 100) / 100 — JS float behaviour gives 5.56
    expect(expense.amount).toBeCloseTo(5.56, 2);
  });

  it("copies category, description, and date from the input fields", () => {
    const fields = validFields({
      category: "Transport",
      description: "Bus fare",
      date: "2024-06-15",
    });
    const expense = createExpense(fields);
    expect(expense.category).toBe("Transport");
    expect(expense.description).toBe("Bus fare");
    expect(expense.date).toBe("2024-06-15");
  });

  it("trims whitespace from description", () => {
    const expense = createExpense(validFields({ description: "  coffee  " }));
    expect(expense.description).toBe("coffee");
  });

  it("converts a numeric amount string to a number", () => {
    const expense = createExpense(validFields({ amount: "42.50" }));
    expect(typeof expense.amount).toBe("number");
    expect(expense.amount).toBe(42.50);
  });
});

// ---------------------------------------------------------------------------
// updateExpense
// ---------------------------------------------------------------------------

describe("updateExpense", () => {
  let original;

  beforeAll(() => {
    original = createExpense(validFields({ amount: "20.00", category: "Books" }));
  });

  it("preserves the original id", () => {
    const updated = updateExpense(original, validFields({ amount: "30.00" }));
    expect(updated.id).toBe(original.id);
  });

  it("preserves the original createdAt timestamp", () => {
    const updated = updateExpense(original, validFields({ amount: "30.00" }));
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it("updates lastModified to a new (or equal) timestamp", () => {
    const before = Date.now();
    const updated = updateExpense(original, validFields({ amount: "30.00" }));
    const after = Date.now();

    expect(updated.lastModified).toBeGreaterThanOrEqual(before);
    expect(updated.lastModified).toBeLessThanOrEqual(after);
  });

  it("applies new field values (amount, category, description, date)", () => {
    const newFields = {
      amount: "99.99",
      category: "Health",
      description: "Doctor visit",
      date: "2024-09-01",
    };
    const updated = updateExpense(original, newFields);

    expect(updated.amount).toBe(99.99);
    expect(updated.category).toBe("Health");
    expect(updated.description).toBe("Doctor visit");
    expect(updated.date).toBe("2024-09-01");
  });

  it("rounds amount to 2 decimal places on update", () => {
    const updated = updateExpense(original, validFields({ amount: "7.777" }));
    expect(updated.amount).toBeCloseTo(7.78, 2);
  });

  it("trims whitespace from description on update", () => {
    const updated = updateExpense(original, validFields({ description: "  trimmed  " }));
    expect(updated.description).toBe("trimmed");
  });

  it("does not mutate the original expense object", () => {
    const originalAmount = original.amount;
    const originalLastModified = original.lastModified;
    updateExpense(original, validFields({ amount: "500.00" }));

    expect(original.amount).toBe(originalAmount);
    expect(original.lastModified).toBe(originalLastModified);
  });
});
