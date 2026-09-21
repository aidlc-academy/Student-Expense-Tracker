/**
 * state.js — in-memory state and mutation functions
 *
 * Owns the single mutable AppState object. No other module mutates state
 * directly; all mutations go through the exported functions below.
 *
 * Data flow (per design.md):
 *   events.js → validate (model.js) → mutate (state.js) → persist (storage.js)
 *   → caller invokes render.js with getState() snapshot
 */

import { loadExpenses, saveExpenses, isStorageAvailable } from "./storage.js";
import { validateExpenseFields, createExpense, updateExpense } from "./model.js";

// ---------------------------------------------------------------------------
// Private module-level state — the single source of truth
// ---------------------------------------------------------------------------

/**
 * @type {{
 *   expenses: import('./types').Expense[],
 *   filter: string,
 *   search: string,
 *   editingId: string|null,
 *   storageAvailable: boolean
 * }}
 */
let state = {
  expenses: [],
  filter: "All",
  search: "",
  editingId: null,
  storageAvailable: true,
};

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise state from localStorage.
 * Must be called once at app startup (by app.js) before any render calls.
 */
export function initState() {
  state.storageAvailable = isStorageAvailable();
  state.expenses = loadExpenses();
  state.filter = "All";
  state.search = "";
  state.editingId = null;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Return a shallow copy of the current state so callers cannot accidentally
 * mutate internal state. The expenses array is also shallow-copied so that
 * push/splice on the copy does not affect the master list; individual Expense
 * objects are treated as immutable by convention.
 *
 * @returns {{ expenses: import('./types').Expense[], filter: string, search: string, editingId: string|null, storageAvailable: boolean }}
 */
export function getState() {
  return { ...state, expenses: [...state.expenses] };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Validate fields and, if valid, create a new Expense, append it to the
 * expense list, and persist to localStorage.
 *
 * @param {{ amount: any, category: any, description: any, date: any }} fields
 * @returns {{ success: boolean, errors?: Record<string,string> }}
 */
export function addExpense(fields) {
  const result = validateExpenseFields(fields);
  if (!result.valid) {
    return { success: false, errors: result.errors };
  }

  const expense = createExpense(fields);
  state.expenses.push(expense);
  saveExpenses(state.expenses);

  return { success: true };
}

/**
 * Validate fields and, if valid, find the matching expense by id, replace it
 * with an updated copy, and persist to localStorage.
 *
 * @param {string} id
 * @param {{ amount: any, category: any, description: any, date: any }} fields
 * @returns {{ success: boolean, errors?: Record<string,string> }}
 */
export function editExpense(id, fields) {
  const result = validateExpenseFields(fields);
  if (!result.valid) {
    return { success: false, errors: result.errors };
  }

  const index = state.expenses.findIndex((e) => e.id === id);
  if (index === -1) {
    // Unknown id — treat as a no-op (shouldn't happen in normal usage)
    return { success: false, errors: { id: "Expense not found." } };
  }

  state.expenses[index] = updateExpense(state.expenses[index], fields);
  saveExpenses(state.expenses);

  return { success: true };
}

/**
 * Remove the expense with the given id from the list and persist.
 *
 * @param {string} id
 */
export function deleteExpense(id) {
  state.expenses = state.expenses.filter((e) => e.id !== id);
  saveExpenses(state.expenses);
}

/**
 * Set the active category filter. Pass "All" to clear the filter.
 *
 * @param {string} category
 */
export function setFilter(category) {
  state.filter = category;
}

/**
 * Set the active search term. Pass an empty string to clear the search.
 *
 * @param {string} term
 */
export function setSearch(term) {
  state.search = term;
}

/**
 * Set the id of the expense currently being edited, or null to leave edit mode.
 *
 * @param {string|null} id
 */
export function setEditingId(id) {
  state.editingId = id;
}
