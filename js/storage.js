/**
 * storage.js — localStorage abstraction
 * Handles read/write of expense data to localStorage with error handling.
 */

const STORAGE_KEY = "student-expense-tracker:expenses";
const TEST_KEY = "student-expense-tracker:__storage_test__";

/**
 * Returns true if localStorage is available and writable.
 * Performs a test write/read/delete to confirm real writability.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    localStorage.setItem(TEST_KEY, "1");
    const val = localStorage.getItem(TEST_KEY);
    localStorage.removeItem(TEST_KEY);
    return val === "1";
  } catch {
    return false;
  }
}

/**
 * Load all expenses from localStorage.
 * Returns [] if the key is absent or if the stored value cannot be parsed.
 * On parse failure, dispatches a "storage:error" custom event on document.
 * @returns {Array}
 */
export function loadExpenses() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    // Guard against non-array values stored under the key
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    document.dispatchEvent(new CustomEvent("storage:error", {
      detail: { message: "Could not parse stored expense data. Starting fresh." }
    }));
    return [];
  }
}

/**
 * Write the full expense array to localStorage.
 * Wraps the write in try/catch; on failure dispatches a "storage:error"
 * custom event on document.
 * @param {Array} expenses
 */
export function saveExpenses(expenses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    document.dispatchEvent(new CustomEvent("storage:error", {
      detail: { message: "Could not save expense data. Your changes may not persist." }
    }));
  }
}
