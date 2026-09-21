/**
 * Unit tests for render.js pure helper functions
 * Requirements: 2.2, 5.2, 5.3, 5.4, 5.5, 6.2, 6.3, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4
 *
 * Covers: getVisibleExpenses, sortExpenseList, sortDashboardRecent,
 *         calcTotal, and formatCurrency.
 *
 * All functions are pure — no DOM or localStorage required.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

const {
  getVisibleExpenses,
  sortExpenseList,
  sortDashboardRecent,
  calcTotal,
  formatCurrency,
} = await import("../../js/render.js");

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid Expense object; override any field via `overrides`. */
function makeExpense(overrides = {}) {
  return {
    id: "id-001",
    amount: 10.0,
    category: "Food",
    description: "Lunch",
    date: "2024-06-01",
    createdAt: 1717200000000,
    lastModified: 1717200000000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getVisibleExpenses
// ---------------------------------------------------------------------------

describe("getVisibleExpenses", () => {
  const expenses = [
    makeExpense({ id: "1", category: "Food",      description: "Lunch",    date: "2024-06-01" }),
    makeExpense({ id: "2", category: "Transport",  description: "Bus ride", date: "2024-06-02" }),
    makeExpense({ id: "3", category: "Books",      description: "Textbook", date: "2024-06-03" }),
    makeExpense({ id: "4", category: "Food",       description: "Dinner",   date: "2024-06-04" }),
  ];

  it("returns all expenses when filter is 'All' and search is empty", () => {
    const state = { expenses, filter: "All", search: "" };
    expect(getVisibleExpenses(state)).toHaveLength(4);
  });

  it("returns only expenses matching the selected category (Req 5.2)", () => {
    const state = { expenses, filter: "Food", search: "" };
    const result = getVisibleExpenses(state);
    expect(result).toHaveLength(2);
    result.forEach((e) => expect(e.category).toBe("Food"));
  });

  it("excludes all expenses from a different category (Req 5.3)", () => {
    const state = { expenses, filter: "Health", search: "" };
    expect(getVisibleExpenses(state)).toHaveLength(0);
  });

  it("returns all expenses when filter is 'All' even if search is empty (Req 5.3)", () => {
    const state = { expenses, filter: "All", search: "" };
    expect(getVisibleExpenses(state)).toHaveLength(4);
  });

  it("filters by search term case-insensitively (Req 6.2)", () => {
    const state = { expenses, filter: "All", search: "LUNCH" };
    const result = getVisibleExpenses(state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all expenses when search is empty (Req 6.3)", () => {
    const state = { expenses, filter: "All", search: "" };
    expect(getVisibleExpenses(state)).toHaveLength(4);
  });

  it("returns no expenses when search term matches nothing", () => {
    const state = { expenses, filter: "All", search: "zzz-no-match" };
    expect(getVisibleExpenses(state)).toHaveLength(0);
  });

  it("applies both category filter and search term simultaneously (Req 5.5)", () => {
    const state = { expenses, filter: "Food", search: "dinner" };
    const result = getVisibleExpenses(state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("returns empty array when category filter matches nothing + search active", () => {
    const state = { expenses, filter: "Health", search: "lunch" };
    expect(getVisibleExpenses(state)).toHaveLength(0);
  });

  it("treats whitespace-only search as effectively empty", () => {
    // A search of "   " has trim() → "" → no filtering
    const state = { expenses, filter: "All", search: "   " };
    expect(getVisibleExpenses(state)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// sortExpenseList
// ---------------------------------------------------------------------------

describe("sortExpenseList", () => {
  it("returns an empty array when given an empty array", () => {
    expect(sortExpenseList([])).toEqual([]);
  });

  it("returns a single-element array unchanged", () => {
    const e = makeExpense();
    expect(sortExpenseList([e])).toEqual([e]);
  });

  it("sorts by date descending (Req 2.2)", () => {
    const a = makeExpense({ id: "a", date: "2024-01-01", createdAt: 1 });
    const b = makeExpense({ id: "b", date: "2024-03-01", createdAt: 2 });
    const c = makeExpense({ id: "c", date: "2024-02-01", createdAt: 3 });
    const sorted = sortExpenseList([a, b, c]);
    expect(sorted.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks date ties by createdAt descending (Req 2.2)", () => {
    const a = makeExpense({ id: "a", date: "2024-06-01", createdAt: 100 });
    const b = makeExpense({ id: "b", date: "2024-06-01", createdAt: 300 });
    const c = makeExpense({ id: "c", date: "2024-06-01", createdAt: 200 });
    const sorted = sortExpenseList([a, b, c]);
    expect(sorted.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the original array", () => {
    const original = [
      makeExpense({ id: "x", date: "2024-01-01" }),
      makeExpense({ id: "y", date: "2024-06-01" }),
    ];
    const copy = [...original];
    sortExpenseList(original);
    expect(original).toEqual(copy);
  });

  it("handles mixed date and createdAt ordering correctly", () => {
    const a = makeExpense({ id: "a", date: "2024-06-02", createdAt: 50 });
    const b = makeExpense({ id: "b", date: "2024-06-01", createdAt: 999 });
    const c = makeExpense({ id: "c", date: "2024-06-02", createdAt: 100 });
    const sorted = sortExpenseList([a, b, c]);
    // date descending: 2024-06-02 first, then 2024-06-01
    // among 2024-06-02: c (createdAt=100) before a (createdAt=50)
    expect(sorted.map((e) => e.id)).toEqual(["c", "a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// sortDashboardRecent
// ---------------------------------------------------------------------------

describe("sortDashboardRecent", () => {
  it("returns an empty array when given an empty array", () => {
    expect(sortDashboardRecent([])).toEqual([]);
  });

  it("returns all expenses when fewer than 5 exist (Req 8.4)", () => {
    const expenses = [
      makeExpense({ id: "1", lastModified: 100 }),
      makeExpense({ id: "2", lastModified: 200 }),
      makeExpense({ id: "3", lastModified: 300 }),
    ];
    expect(sortDashboardRecent(expenses)).toHaveLength(3);
  });

  it("returns exactly 5 expenses when 5 or more exist (Req 8.3)", () => {
    const expenses = Array.from({ length: 8 }, (_, i) =>
      makeExpense({ id: `id-${i}`, lastModified: i * 1000 })
    );
    expect(sortDashboardRecent(expenses)).toHaveLength(5);
  });

  it("returns the 5 most recently modified expenses (Req 8.3)", () => {
    const expenses = [
      makeExpense({ id: "old1", lastModified: 100 }),
      makeExpense({ id: "old2", lastModified: 200 }),
      makeExpense({ id: "old3", lastModified: 300 }),
      makeExpense({ id: "new1", lastModified: 1000 }),
      makeExpense({ id: "new2", lastModified: 900 }),
      makeExpense({ id: "new3", lastModified: 800 }),
      makeExpense({ id: "new4", lastModified: 700 }),
      makeExpense({ id: "new5", lastModified: 600 }),
    ];
    const result = sortDashboardRecent(expenses);
    const ids = result.map((e) => e.id);
    expect(ids).toContain("new1");
    expect(ids).toContain("new2");
    expect(ids).toContain("new3");
    expect(ids).toContain("new4");
    expect(ids).toContain("new5");
    expect(ids).not.toContain("old1");
    expect(ids).not.toContain("old2");
    expect(ids).not.toContain("old3");
  });

  it("orders results by lastModified descending (Req 8.3)", () => {
    const expenses = [
      makeExpense({ id: "a", lastModified: 300 }),
      makeExpense({ id: "b", lastModified: 100 }),
      makeExpense({ id: "c", lastModified: 200 }),
      makeExpense({ id: "d", lastModified: 500 }),
      makeExpense({ id: "e", lastModified: 400 }),
    ];
    const result = sortDashboardRecent(expenses);
    expect(result.map((e) => e.id)).toEqual(["d", "e", "a", "c", "b"]);
  });

  it("breaks lastModified ties by id descending (lexicographic) (Req 8.3)", () => {
    // "z" > "a" lexicographically, so "z" should appear first
    const expenses = [
      makeExpense({ id: "a-001", lastModified: 500 }),
      makeExpense({ id: "z-999", lastModified: 500 }),
      makeExpense({ id: "m-500", lastModified: 500 }),
      makeExpense({ id: "b-002", lastModified: 500 }),
      makeExpense({ id: "k-100", lastModified: 500 }),
    ];
    const result = sortDashboardRecent(expenses);
    expect(result[0].id).toBe("z-999");
  });

  it("does not mutate the original array", () => {
    const expenses = [
      makeExpense({ id: "1", lastModified: 100 }),
      makeExpense({ id: "2", lastModified: 200 }),
    ];
    const copy = [...expenses];
    sortDashboardRecent(expenses);
    expect(expenses).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// calcTotal
// ---------------------------------------------------------------------------

describe("calcTotal", () => {
  it("returns 0 for an empty array (Req 7.3)", () => {
    expect(calcTotal([])).toBe(0);
  });

  it("returns 0 for null / undefined input", () => {
    expect(calcTotal(null)).toBe(0);
    expect(calcTotal(undefined)).toBe(0);
  });

  it("returns the amount of a single expense (Req 7.2)", () => {
    expect(calcTotal([makeExpense({ amount: 42.5 })])).toBe(42.5);
  });

  it("sums multiple expense amounts (Req 7.2)", () => {
    const expenses = [
      makeExpense({ amount: 10 }),
      makeExpense({ amount: 20 }),
      makeExpense({ amount: 5.5 }),
    ];
    expect(calcTotal(expenses)).toBe(35.5);
  });

  it("rounds result to exactly 2 decimal places (Req 7.2)", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in floating point — must round to 0.30
    const expenses = [
      makeExpense({ amount: 0.1 }),
      makeExpense({ amount: 0.2 }),
    ];
    expect(calcTotal(expenses)).toBe(0.3);
  });

  it("handles amounts with more than 2 d.p. gracefully", () => {
    // amounts stored are already rounded to 2 d.p. by model.js;
    // 1.005 in IEEE 754 is slightly below 1.005, so Math.round(1.005 * 100)
    // yields 100 (i.e. 1.00), and 2.004 rounds to 200 (i.e. 2.00) → sum 3.00
    const expenses = [makeExpense({ amount: 1.005 }), makeExpense({ amount: 2.004 })];
    expect(calcTotal(expenses)).toBe(3.0);
  });

  it("returns 0 when all visible expenses are in a filtered-out category (Req 5.4)", () => {
    // Caller is expected to pass already-filtered list; empty list → 0
    expect(calcTotal([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  const origWindow = globalThis.window;

  beforeEach(() => {
    // Reset any currency override between tests
    if (typeof globalThis.window !== "undefined") {
      delete globalThis.window.EXPENSE_TRACKER_CURRENCY;
    }
  });

  afterEach(() => {
    if (typeof globalThis.window !== "undefined") {
      delete globalThis.window.EXPENSE_TRACKER_CURRENCY;
    }
  });

  it("returns INR format by default — '₹ X.XX' (Req 7.4)", () => {
    expect(formatCurrency(12.5)).toBe("₹ 12.50");
  });

  it("always formats to exactly 2 decimal places for INR (Req 2.1)", () => {
    expect(formatCurrency(100)).toBe("₹ 100.00");
    expect(formatCurrency(0)).toBe("₹ 0.00");
    expect(formatCurrency(1.1)).toBe("₹ 1.10");
  });

  it("returns USD format when window.EXPENSE_TRACKER_CURRENCY is 'USD' (Req 7.5)", () => {
    if (typeof globalThis.window === "undefined") {
      globalThis.window = {};
    }
    globalThis.window.EXPENSE_TRACKER_CURRENCY = "USD";
    expect(formatCurrency(12.5)).toBe("$ 12.50");
  });

  it("always formats to exactly 2 decimal places for USD (Req 2.1)", () => {
    if (typeof globalThis.window === "undefined") {
      globalThis.window = {};
    }
    globalThis.window.EXPENSE_TRACKER_CURRENCY = "USD";
    expect(formatCurrency(0)).toBe("$ 0.00");
    expect(formatCurrency(999999.99)).toBe("$ 999999.99");
  });

  it("falls back to INR when EXPENSE_TRACKER_CURRENCY is unrecognised", () => {
    if (typeof globalThis.window === "undefined") {
      globalThis.window = {};
    }
    globalThis.window.EXPENSE_TRACKER_CURRENCY = "GBP"; // not configured → default ₹
    expect(formatCurrency(5)).toBe("₹ 5.00");
  });
});
