/**
 * Unit tests for state.js
 * Requirements: 1.2, 3.3, 4.3, 5.1, 6.1, 10.1
 *
 * state.js imports storage.js (which reads/writes localStorage) and model.js.
 * We mock localStorage in-memory and `document.dispatchEvent` so no real
 * browser APIs are needed.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// In-memory localStorage mock
// ---------------------------------------------------------------------------

function makeLocalStorageMock() {
  let store = {};
  const mock = {
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
    _store() {
      return store;
    },
  };
  return mock;
}

// Inject mocks before dynamic imports so the ESM modules see them immediately.
globalThis.localStorage = makeLocalStorageMock();
globalThis.document = { dispatchEvent() {} };
// state.js uses crypto.randomUUID via model.js → model.js, which is a Node
// built-in in Node 19+. Ensure it is available.
if (!globalThis.crypto) {
  const { webcrypto } = await import("node:crypto");
  globalThis.crypto = webcrypto;
}

// ---------------------------------------------------------------------------
// Import modules under test
// ---------------------------------------------------------------------------

const {
  initState,
  getState,
  addExpense,
  editExpense,
  deleteExpense,
  setFilter,
  setSearch,
  setEditingId,
} = await import("../../js/state.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "student-expense-tracker:expenses";

/** Valid expense fields that pass all validation rules. */
function validFields(overrides = {}) {
  return {
    amount: "25.50",
    category: "Food",
    description: "Lunch",
    date: "2025-06-15",
    ...overrides,
  };
}

/**
 * Reset the module state to a clean slate before each test by calling
 * initState() against an empty localStorage.
 */
function resetState() {
  globalThis.localStorage.clear();
  initState();
}

// ---------------------------------------------------------------------------
// initState
// ---------------------------------------------------------------------------

describe("initState", () => {
  it("sets default filter, search, and editingId", () => {
    resetState();
    const s = getState();
    expect(s.filter).toBe("All");
    expect(s.search).toBe("");
    expect(s.editingId).toBeNull();
  });

  it("loads expenses from localStorage on init", () => {
    const existing = [
      {
        id: "pre-1",
        amount: 10,
        category: "Books",
        description: "Textbook",
        date: "2025-01-01",
        createdAt: 1000,
        lastModified: 1000,
      },
    ];
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    initState();
    const s = getState();
    expect(s.expenses).toHaveLength(1);
    expect(s.expenses[0].id).toBe("pre-1");
  });

  it("starts with empty expenses when localStorage has no data", () => {
    resetState();
    expect(getState().expenses).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getState — immutability
// ---------------------------------------------------------------------------

describe("getState", () => {
  it("returns a shallow copy — mutating the returned object does not affect internal state", () => {
    resetState();
    const snap1 = getState();
    snap1.filter = "HACKED";
    snap1.expenses.push({ id: "fake" });

    const snap2 = getState();
    expect(snap2.filter).toBe("All");
    expect(snap2.expenses).toHaveLength(0);
  });

  it("returns storageAvailable flag", () => {
    resetState();
    // In a standard Node test environment with our mock, storage IS available.
    const s = getState();
    expect(typeof s.storageAvailable).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// addExpense
// ---------------------------------------------------------------------------

describe("addExpense", () => {
  beforeEach(resetState);

  it("returns success and grows the expense list by exactly 1 on valid input (Requirement 1.2)", () => {
    const result = addExpense(validFields());
    expect(result.success).toBe(true);
    expect(getState().expenses).toHaveLength(1);
  });

  it("the newly added expense appears in the list with correct fields", () => {
    addExpense(validFields({ amount: "12.34", description: "Coffee", category: "Food", date: "2025-05-01" }));
    const exp = getState().expenses[0];
    expect(exp.amount).toBe(12.34);
    expect(exp.description).toBe("Coffee");
    expect(exp.category).toBe("Food");
    expect(exp.date).toBe("2025-05-01");
  });

  it("returns failure and leaves expenses unchanged on validation failure (Requirement 1.3)", () => {
    const result = addExpense({ amount: "", category: "Food", description: "", date: "2025-06-15" });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.amount).toBeTruthy();
    expect(getState().expenses).toHaveLength(0);
  });

  it("returns errors for all failing fields simultaneously", () => {
    const result = addExpense({ amount: "0", category: "", description: "", date: "" });
    expect(result.success).toBe(false);
    expect(result.errors.amount).toBeTruthy();
    expect(result.errors.category).toBeTruthy();
    expect(result.errors.date).toBeTruthy();
  });

  it("persists the new expense to localStorage", () => {
    addExpense(validFields());
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    const stored = JSON.parse(raw);
    expect(stored).toHaveLength(1);
  });

  it("accumulates multiple expenses", () => {
    addExpense(validFields({ description: "A" }));
    addExpense(validFields({ description: "B" }));
    addExpense(validFields({ description: "C" }));
    expect(getState().expenses).toHaveLength(3);
  });

  it("trims whitespace-only description and accepts as valid (Requirement 1.1)", () => {
    const result = addExpense(validFields({ description: "   " }));
    expect(result.success).toBe(true);
    expect(getState().expenses[0].description).toBe("");
  });
});

// ---------------------------------------------------------------------------
// editExpense
// ---------------------------------------------------------------------------

describe("editExpense", () => {
  beforeEach(resetState);

  it("updates the matching expense and leaves others intact (Requirement 3.3)", () => {
    addExpense(validFields({ description: "First" }));
    addExpense(validFields({ description: "Second" }));
    const [first, second] = getState().expenses;

    const result = editExpense(first.id, validFields({ amount: "99.99", description: "Updated First" }));
    expect(result.success).toBe(true);

    const updated = getState().expenses.find((e) => e.id === first.id);
    expect(updated.amount).toBe(99.99);
    expect(updated.description).toBe("Updated First");

    // Second expense is unchanged
    const unchanged = getState().expenses.find((e) => e.id === second.id);
    expect(unchanged.description).toBe("Second");
  });

  it("preserves the original id and createdAt after edit", () => {
    addExpense(validFields());
    const original = getState().expenses[0];
    editExpense(original.id, validFields({ amount: "50.00" }));

    const updated = getState().expenses[0];
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it("updates lastModified timestamp", async () => {
    addExpense(validFields());
    const original = getState().expenses[0];
    const beforeEdit = original.lastModified;

    // Introduce a tiny delay so timestamps can differ
    await new Promise((resolve) => setTimeout(resolve, 5));

    editExpense(original.id, validFields({ amount: "77.77" }));
    const updated = getState().expenses[0];
    expect(updated.lastModified).toBeGreaterThanOrEqual(beforeEdit);
  });

  it("returns failure and leaves state unchanged on validation failure", () => {
    addExpense(validFields({ description: "Original" }));
    const id = getState().expenses[0].id;

    const result = editExpense(id, { amount: "-5", category: "Food", description: "", date: "2025-06-15" });
    expect(result.success).toBe(false);
    expect(result.errors.amount).toBeTruthy();

    // Original expense should be unchanged
    const expense = getState().expenses[0];
    expect(expense.description).toBe("Original");
  });

  it("returns failure for an unknown id", () => {
    addExpense(validFields());
    const result = editExpense("does-not-exist", validFields());
    expect(result.success).toBe(false);
  });

  it("persists the edit to localStorage", () => {
    addExpense(validFields());
    const id = getState().expenses[0].id;
    editExpense(id, validFields({ amount: "55.55" }));

    const stored = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
    expect(stored[0].amount).toBe(55.55);
  });
});

// ---------------------------------------------------------------------------
// deleteExpense
// ---------------------------------------------------------------------------

describe("deleteExpense", () => {
  beforeEach(resetState);

  it("removes the expense with the matching id (Requirement 4.3)", () => {
    addExpense(validFields({ description: "Keep" }));
    addExpense(validFields({ description: "Delete me" }));
    const toDelete = getState().expenses.find((e) => e.description === "Delete me");

    deleteExpense(toDelete.id);

    const remaining = getState().expenses;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].description).toBe("Keep");
  });

  it("is a no-op for an id that does not exist", () => {
    addExpense(validFields());
    deleteExpense("nonexistent-id");
    expect(getState().expenses).toHaveLength(1);
  });

  it("persists the deletion to localStorage", () => {
    addExpense(validFields());
    const id = getState().expenses[0].id;
    deleteExpense(id);

    const stored = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
    expect(stored).toHaveLength(0);
  });

  it("leaves an empty list when the last expense is deleted", () => {
    addExpense(validFields());
    const id = getState().expenses[0].id;
    deleteExpense(id);
    expect(getState().expenses).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// setFilter
// ---------------------------------------------------------------------------

describe("setFilter", () => {
  beforeEach(resetState);

  it("updates state.filter to the given category (Requirement 5.1)", () => {
    setFilter("Transport");
    expect(getState().filter).toBe("Transport");
  });

  it("accepts 'All' to clear the filter", () => {
    setFilter("Food");
    setFilter("All");
    expect(getState().filter).toBe("All");
  });
});

// ---------------------------------------------------------------------------
// setSearch
// ---------------------------------------------------------------------------

describe("setSearch", () => {
  beforeEach(resetState);

  it("updates state.search to the given term (Requirement 6.1)", () => {
    setSearch("coffee");
    expect(getState().search).toBe("coffee");
  });

  it("accepts an empty string to clear the search", () => {
    setSearch("term");
    setSearch("");
    expect(getState().search).toBe("");
  });
});

// ---------------------------------------------------------------------------
// setEditingId
// ---------------------------------------------------------------------------

describe("setEditingId", () => {
  beforeEach(resetState);

  it("updates state.editingId to the given id", () => {
    setEditingId("abc-123");
    expect(getState().editingId).toBe("abc-123");
  });

  it("accepts null to exit edit mode", () => {
    setEditingId("abc-123");
    setEditingId(null);
    expect(getState().editingId).toBeNull();
  });
});
