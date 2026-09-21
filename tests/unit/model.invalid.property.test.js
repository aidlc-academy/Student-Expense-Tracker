/**
 * Property-based tests for model.js — Property 4
 *
 * Feature: student-expense-tracker, Property 4: Invalid inputs are always rejected without mutating state
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 3.4, 3.5
 */

// Feature: student-expense-tracker, Property 4: Invalid inputs are always rejected without mutating state

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import { validateExpenseFields, CATEGORIES } from "../../js/model.js";

// ---------------------------------------------------------------------------
// Arbitraries for valid baseline values (used as "good" counterparts)
// ---------------------------------------------------------------------------

const VALID_CATEGORY = fc.constantFrom(...CATEGORIES);

/** ISO "YYYY-MM-DD" date that is not more than 365 days in the future */
const validDateArb = fc.date({
  min: new Date("2000-01-01"),
  // Stay safely within the allowed window to avoid off-by-one edge cases
  max: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
}).map((d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
});

/** Valid description: trimmed length 0–250 */
const validDescriptionArb = fc.string({ minLength: 0, maxLength: 250 });

// ---------------------------------------------------------------------------
// Arbitraries for each individual invalid field
// ---------------------------------------------------------------------------

/**
 * Invalid amount values:
 *  - empty string / null / undefined  → required
 *  - 0 or negative                    → below minimum 0.01
 *  - > 999999.99                      → above maximum
 *  - NaN strings / non-numeric        → not a number
 */
const invalidAmountArb = fc.oneof(
  // empty-ish values
  fc.constantFrom("", null, undefined),
  // zero
  fc.constant(0),
  // negative numbers
  fc.double({ min: -1_000_000, max: -0.001, noNaN: true }).map((n) => n),
  // above maximum
  fc.double({ min: 1_000_000, max: 1_000_000_000, noNaN: true }),
  // non-numeric strings
  fc.constantFrom("abc", "NaN", "--1", "1e999", "∞"),
);

/**
 * Invalid category values:
 *  - empty string / null / undefined  → required
 *  - strings not in CATEGORIES        → not a valid category
 *  - wrong-case variants              → e.g. "food", "BOOKS"
 */
const invalidCategoryArb = fc.oneof(
  fc.constantFrom("", null, undefined),
  fc.constantFrom("food", "transport", "books", "entertainment", "health", "other"),
  fc.constantFrom("FOOD", "TRANSPORT", "BOOKS"),
  fc.constantFrom("Invalid", "Groceries", "Misc", "Shopping"),
  // Completely random string that is highly unlikely to match a category
  fc.string({ minLength: 1, maxLength: 30 }).filter(
    (s) => !CATEGORIES.includes(s) && s.trim() !== ""
  ),
);

/**
 * Invalid date values:
 *  - empty string / null / undefined  → required
 *  - unparseable strings              → invalid date
 *  - dates more than 365 days ahead   → out of allowed range
 */
const futureDateArb = fc.date({
  // At least 366 days in the future (well outside the allowed window)
  min: new Date(Date.now() + 366 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000),
  max: new Date("2999-12-31"),
}).map((d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
});

const invalidDateArb = fc.oneof(
  fc.constantFrom("", null, undefined),
  fc.constantFrom("not-a-date", "32/13/2025", "abcdefgh", "0000-99-99"),
  futureDateArb,
);

/**
 * Invalid description values:
 *  - strings longer than 250 characters after trimming
 */
const invalidDescriptionArb = fc.string({ minLength: 251, maxLength: 500 }).map(
  // Make sure there is no leading/trailing whitespace that would trim it down to ≤250
  (s) => "x".repeat(251) + s
);

// ---------------------------------------------------------------------------
// Composite arbitraries: at least one field is invalid
// ---------------------------------------------------------------------------

/**
 * Build a fields object where EXACTLY the amount is invalid; all other fields
 * are valid so we isolate the amount-validation path.
 */
const invalidAmountFieldsArb = fc.record({
  amount: invalidAmountArb,
  category: VALID_CATEGORY,
  description: validDescriptionArb,
  date: validDateArb,
});

/**
 * Build a fields object where EXACTLY the category is invalid.
 */
const invalidCategoryFieldsArb = fc.record({
  amount: fc.double({ min: 0.01, max: 999_999.99, noNaN: true }).map(
    (n) => Math.round(n * 100) / 100
  ),
  category: invalidCategoryArb,
  description: validDescriptionArb,
  date: validDateArb,
});

/**
 * Build a fields object where EXACTLY the date is invalid.
 */
const invalidDateFieldsArb = fc.record({
  amount: fc.double({ min: 0.01, max: 999_999.99, noNaN: true }).map(
    (n) => Math.round(n * 100) / 100
  ),
  category: VALID_CATEGORY,
  description: validDescriptionArb,
  date: invalidDateArb,
});

/**
 * Build a fields object where EXACTLY the description is invalid (too long).
 */
const invalidDescriptionFieldsArb = fc.record({
  amount: fc.double({ min: 0.01, max: 999_999.99, noNaN: true }).map(
    (n) => Math.round(n * 100) / 100
  ),
  category: VALID_CATEGORY,
  description: invalidDescriptionArb,
  date: validDateArb,
});

/**
 * Build a fields object where ANY combination of fields may be invalid
 * (at least one field chosen from an invalid arbitrary).
 *
 * We achieve "at least one invalid" by picking one of the four single-field
 * invalid arbitraries via fc.oneof, then optionally corrupting additional fields.
 */
const atLeastOneInvalidFieldsArb = fc.oneof(
  invalidAmountFieldsArb,
  invalidCategoryFieldsArb,
  invalidDateFieldsArb,
  invalidDescriptionFieldsArb,
);

// ---------------------------------------------------------------------------
// Helper assertion
// ---------------------------------------------------------------------------

function assertRejected(fields) {
  const originalFields = { ...fields }; // shallow copy to verify no mutation

  const result = validateExpenseFields(fields);

  // P4 assertion 1: valid must be false
  expect(result.valid).toBe(false);

  // P4 assertion 2: errors must be non-empty (at least one error key)
  expect(Object.keys(result.errors).length).toBeGreaterThan(0);

  // P4 assertion 3 (no state mutation): input object fields are unchanged
  expect(fields).toEqual(originalFields);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("model.js — Property 4: Invalid inputs are always rejected without mutating state", () => {

  it("invalid amount always produces valid=false and non-empty errors", () => {
    fc.assert(
      fc.property(invalidAmountFieldsArb, (fields) => {
        assertRejected(fields);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  it("invalid category always produces valid=false and non-empty errors", () => {
    fc.assert(
      fc.property(invalidCategoryFieldsArb, (fields) => {
        assertRejected(fields);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  it("invalid date always produces valid=false and non-empty errors", () => {
    fc.assert(
      fc.property(invalidDateFieldsArb, (fields) => {
        assertRejected(fields);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  it("description exceeding 250 characters always produces valid=false and non-empty errors", () => {
    fc.assert(
      fc.property(invalidDescriptionFieldsArb, (fields) => {
        assertRejected(fields);
      }),
      { numRuns: 100, verbose: true }
    );
  });

  it("any combination with at least one invalid field always produces valid=false and non-empty errors", () => {
    fc.assert(
      fc.property(atLeastOneInvalidFieldsArb, (fields) => {
        assertRejected(fields);
      }),
      { numRuns: 200, verbose: false }
    );
  });

  // --- Spot checks for specific invalid inputs from the spec ---

  it("rejects empty amount (empty string)", () => {
    assertRejected({ amount: "", category: "Food", description: "", date: "2025-01-01" });
  });

  it("rejects amount = null", () => {
    assertRejected({ amount: null, category: "Food", description: "", date: "2025-01-01" });
  });

  it("rejects amount = 0", () => {
    assertRejected({ amount: 0, category: "Food", description: "", date: "2025-01-01" });
  });

  it("rejects negative amount", () => {
    assertRejected({ amount: -1, category: "Food", description: "", date: "2025-01-01" });
  });

  it("rejects amount > 999999.99", () => {
    assertRejected({ amount: 1_000_000, category: "Food", description: "", date: "2025-01-01" });
  });

  it("rejects empty category", () => {
    assertRejected({ amount: 10, category: "", description: "", date: "2025-01-01" });
  });

  it("rejects category = null", () => {
    assertRejected({ amount: 10, category: null, description: "", date: "2025-01-01" });
  });

  it("rejects category not in CATEGORIES (wrong case)", () => {
    assertRejected({ amount: 10, category: "food", description: "", date: "2025-01-01" });
  });

  it("rejects category not in CATEGORIES (arbitrary string)", () => {
    assertRejected({ amount: 10, category: "Invalid", description: "", date: "2025-01-01" });
  });

  it("rejects empty date", () => {
    assertRejected({ amount: 10, category: "Food", description: "", date: "" });
  });

  it("rejects unparseable date string", () => {
    assertRejected({ amount: 10, category: "Food", description: "", date: "not-a-date" });
  });

  it("rejects description of exactly 251 characters", () => {
    assertRejected({ amount: 10, category: "Food", description: "a".repeat(251), date: "2025-01-01" });
  });

  it("rejects all-empty fields (multiple errors)", () => {
    const result = validateExpenseFields({ amount: "", category: "", description: "", date: "" });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(2);
  });
});
