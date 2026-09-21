/**
 * Unit tests for storage.js
 * Requirements: 10.1, 10.2, 10.3
 *
 * localStorage is unavailable in Node, so we mock it with an in-memory
 * implementation before importing the module.  document.dispatchEvent is
 * similarly mocked so we can assert that "storage:error" custom events are
 * dispatched on the expected error paths.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// localStorage mock (in-memory)
// ---------------------------------------------------------------------------

function makeLocalStorageMock() {
  let store = {};
  return {
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
}

// ---------------------------------------------------------------------------
// Globals expected by storage.js (Node has neither localStorage nor document)
// ---------------------------------------------------------------------------

let localStorageMock;
let dispatchedEvents;

beforeEach(() => {
  localStorageMock = makeLocalStorageMock();
  dispatchedEvents = [];

  // Inject into globalThis so the imported module sees them
  globalThis.localStorage = localStorageMock;
  globalThis.document = {
    dispatchEvent(event) {
      dispatchedEvents.push(event);
    },
  };
});

afterEach(() => {
  delete globalThis.localStorage;
  delete globalThis.document;
});

// ---------------------------------------------------------------------------
// Import module under test (ESM dynamic import so mocks are in place first)
// ---------------------------------------------------------------------------

// We use a top-level await-compatible pattern via an async factory.
// With --experimental-vm-modules the module cache is NOT reset between tests,
// so we import once and share the exports across all tests in this file.
const { loadExpenses, saveExpenses, isStorageAvailable } = await import(
  "../../js/storage.js"
);

const STORAGE_KEY = "student-expense-tracker:expenses";

// ---------------------------------------------------------------------------
// isStorageAvailable
// ---------------------------------------------------------------------------

describe("isStorageAvailable", () => {
  it("returns true when localStorage works normally", () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it("returns false when localStorage.setItem throws", () => {
    globalThis.localStorage = {
      setItem() {
        throw new DOMException("QuotaExceededError");
      },
      getItem() {
        return null;
      },
      removeItem() {},
    };
    expect(isStorageAvailable()).toBe(false);
  });

  it("returns false when localStorage.getItem returns a different value (tampered)", () => {
    // Simulate a localStorage where the test write is not readable back
    globalThis.localStorage = {
      setItem() {},
      getItem() {
        return null; // does not return the value we wrote
      },
      removeItem() {},
    };
    expect(isStorageAvailable()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loadExpenses
// ---------------------------------------------------------------------------

describe("loadExpenses", () => {
  it("returns [] when the storage key is absent (Requirement 10.2)", () => {
    // Nothing written — key is absent
    expect(loadExpenses()).toEqual([]);
  });

  it("returns the parsed array when valid JSON is stored (Requirement 10.2)", () => {
    const expenses = [
      {
        id: "abc-123",
        amount: 12.5,
        category: "Food",
        description: "Lunch",
        date: "2024-06-01",
        createdAt: 1717200000000,
        lastModified: 1717200000000,
      },
    ];
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(expenses));
    expect(loadExpenses()).toEqual(expenses);
  });

  it("returns [] when valid JSON is stored but is not an array", () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(loadExpenses()).toEqual([]);
  });

  it("returns [] and dispatches storage:error when JSON is corrupt (Requirement 10.3)", () => {
    localStorageMock.setItem(STORAGE_KEY, "not valid json {{{{");
    const result = loadExpenses();

    expect(result).toEqual([]);
    expect(dispatchedEvents).toHaveLength(1);
    expect(dispatchedEvents[0].type).toBe("storage:error");
    expect(dispatchedEvents[0].detail.message).toBeTruthy();
  });

  it("returns [] and dispatches storage:error when JSON is a bare string", () => {
    // JSON.parse("\"hello\"") is valid JSON but not an array, so it returns [].
    // However if the stored value is something like `undefined` as text it will throw.
    localStorageMock.setItem(STORAGE_KEY, "undefined");
    const result = loadExpenses();
    expect(result).toEqual([]);
    // "undefined" is not valid JSON, so parse throws → error event fired
    expect(dispatchedEvents).toHaveLength(1);
  });

  it("preserves all Expense fields through a load round-trip (Requirement 10.5)", () => {
    const original = [
      {
        id: "id-001",
        amount: 99.99,
        category: "Transport",
        description: "Bus pass",
        date: "2024-03-15",
        createdAt: 1710460000000,
        lastModified: 1710460000000,
      },
      {
        id: "id-002",
        amount: 5.0,
        category: "Food",
        description: "",
        date: "2024-03-16",
        createdAt: 1710550000000,
        lastModified: 1710560000000,
      },
    ];
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(original));
    const loaded = loadExpenses();
    expect(loaded).toHaveLength(2);
    for (let i = 0; i < original.length; i++) {
      expect(loaded[i].id).toBe(original[i].id);
      expect(loaded[i].amount).toBe(original[i].amount);
      expect(loaded[i].category).toBe(original[i].category);
      expect(loaded[i].description).toBe(original[i].description);
      expect(loaded[i].date).toBe(original[i].date);
    }
  });
});

// ---------------------------------------------------------------------------
// saveExpenses
// ---------------------------------------------------------------------------

describe("saveExpenses", () => {
  it("writes expenses as JSON to the correct key (Requirement 10.1)", () => {
    const expenses = [
      {
        id: "xyz",
        amount: 20,
        category: "Books",
        description: "Textbook",
        date: "2024-05-01",
        createdAt: 1714560000000,
        lastModified: 1714560000000,
      },
    ];
    saveExpenses(expenses);
    const raw = localStorageMock.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw)).toEqual(expenses);
  });

  it("saves an empty array without error", () => {
    saveExpenses([]);
    const raw = localStorageMock.getItem(STORAGE_KEY);
    expect(JSON.parse(raw)).toEqual([]);
  });

  it("overwrites a previously saved value", () => {
    const first = [{ id: "1", amount: 1, category: "Food", description: "", date: "2024-01-01", createdAt: 0, lastModified: 0 }];
    const second = [{ id: "2", amount: 2, category: "Health", description: "", date: "2024-02-01", createdAt: 0, lastModified: 0 }];
    saveExpenses(first);
    saveExpenses(second);
    const raw = localStorageMock.getItem(STORAGE_KEY);
    expect(JSON.parse(raw)).toEqual(second);
  });

  it("dispatches storage:error when setItem throws (quota exceeded) (Requirement 10.3)", () => {
    // Replace localStorage with one whose setItem always throws
    globalThis.localStorage = {
      setItem() {
        throw new DOMException("QuotaExceededError");
      },
      getItem() {
        return null;
      },
      removeItem() {},
    };

    saveExpenses([{ id: "q", amount: 1, category: "Other", description: "", date: "2024-01-01", createdAt: 0, lastModified: 0 }]);

    expect(dispatchedEvents).toHaveLength(1);
    expect(dispatchedEvents[0].type).toBe("storage:error");
    expect(dispatchedEvents[0].detail.message).toBeTruthy();
  });

  it("does not dispatch storage:error on a successful write", () => {
    saveExpenses([]);
    expect(dispatchedEvents).toHaveLength(0);
  });
});
