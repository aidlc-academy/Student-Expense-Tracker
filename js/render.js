/**
 * render.js — pure rendering functions (state → DOM)
 *
 * This module is split into two concerns:
 *  1. Pure helper functions (sorting, filtering, totalling) — task 7.1
 *  2. DOM-rendering functions — task 7.8
 */

import { CATEGORIES } from "./model.js";

// ---------------------------------------------------------------------------
// Currency configuration
// ---------------------------------------------------------------------------

/**
 * Currency configuration for the tracker.
 * "INR" → ₹  (default, per requirement 7.4)
 * "USD" → $   (per requirement 7.5, configuration-driven)
 *
 * Override via:  window.EXPENSE_TRACKER_CURRENCY = "USD";
 * or by setting the module-level constant below.
 */
export const CURRENCY =
  (typeof window !== "undefined" && window.EXPENSE_TRACKER_CURRENCY) || "INR";

// ---------------------------------------------------------------------------
// Pure helper functions — task 7.1
// ---------------------------------------------------------------------------

/**
 * Return the subset of expenses that satisfy the currently active filter and
 * search term.
 *
 * - Category filter: exact match against `state.filter`; "All" passes every expense.
 * - Search filter: case-insensitive substring match against `expense.description`.
 *   Empty `state.search` passes every expense.
 *
 * @param {{ expenses: Expense[], filter: string, search: string }} state
 * @returns {Expense[]}
 */
export function getVisibleExpenses(state) {
  const { expenses, filter, search } = state;
  const term = (search ?? "").trim().toLowerCase();
  const cat = filter ?? "All";

  return expenses.filter((expense) => {
    // Category constraint
    if (cat !== "All" && expense.category !== cat) {
      return false;
    }

    // Search constraint (case-insensitive includes on description)
    if (term !== "" && !expense.description.toLowerCase().includes(term)) {
      return false;
    }

    return true;
  });
}

/**
 * Return a new array of expenses sorted for the Expense List view:
 *   primary   — date descending  (lexicographic "YYYY-MM-DD" string comparison)
 *   secondary — createdAt descending (numeric)
 *
 * The original array is NOT mutated.
 *
 * @param {Expense[]} expenses
 * @returns {Expense[]}
 */
export function sortExpenseList(expenses) {
  return [...expenses].sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    // Same date — sort by createdAt descending
    return b.createdAt - a.createdAt;
  });
}

/**
 * Return the (up to) five most recently modified expenses for the Dashboard.
 *
 * Sort order:
 *   primary   — lastModified descending (numeric)
 *   secondary — id descending (lexicographic, for a deterministic tie-break)
 *
 * @param {Expense[]} expenses
 * @returns {Expense[]}
 */
export function sortDashboardRecent(expenses) {
  return [...expenses]
    .sort((a, b) => {
      if (b.lastModified !== a.lastModified) {
        return b.lastModified - a.lastModified;
      }
      // Same lastModified — sort by id descending (lexicographic)
      if (a.id < b.id) return 1;
      if (a.id > b.id) return -1;
      return 0;
    })
    .slice(0, 5);
}

/**
 * Sum the `amount` fields of all given expenses, rounded to exactly 2 decimal
 * places. Returns 0 for an empty array.
 *
 * Floating-point safe: accumulates in integer cents then divides.
 *
 * @param {Expense[]} expenses
 * @returns {number}
 */
export function calcTotal(expenses) {
  if (!expenses || expenses.length === 0) return 0;

  // Accumulate in integer cents to avoid floating-point drift
  const totalCents = expenses.reduce((sum, expense) => {
    return sum + Math.round(expense.amount * 100);
  }, 0);

  return Math.round(totalCents) / 100;
}

/**
 * Format a numeric amount as a localised currency string.
 *
 * Uses the module-level CURRENCY constant (or window.EXPENSE_TRACKER_CURRENCY
 * if set) to determine the symbol:
 *   "INR" → "₹ X.XX"  (default)
 *   "USD" → "$ X.XX"
 *
 * Always produces exactly 2 decimal places.
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const currency =
    (typeof window !== "undefined" && window.EXPENSE_TRACKER_CURRENCY) ||
    CURRENCY;
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol} ${Number(amount).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// DOM rendering functions — task 7.8
// ---------------------------------------------------------------------------

/**
 * Format a date string "YYYY-MM-DD" as "DD/MM/YYYY" for display.
 * Falls back to the original string if parsing fails.
 *
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Return today's date as an ISO "YYYY-MM-DD" string in local time.
 *
 * @returns {string}
 */
function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Build the HTML for a single expense row (table row for desktop).
 *
 * @param {import('./types').Expense} expense
 * @returns {string}
 */
function buildTableRow(expense) {
  const desc = expense.description
    ? `<span>${_escapeHtml(expense.description)}</span>`
    : `<span class="field-hint">—</span>`;
  return `
    <tr>
      <td data-label="Date">${_escapeHtml(formatDate(expense.date))}</td>
      <td data-label="Category"><span class="category-badge">${_escapeHtml(expense.category)}</span></td>
      <td data-label="Description">${desc}</td>
      <td data-label="Amount" class="col-amount">${_escapeHtml(formatCurrency(expense.amount))}</td>
      <td class="col-actions">
        <button
          type="button"
          class="btn btn-ghost"
          data-id="${_escapeHtml(expense.id)}"
          data-action="edit"
          aria-label="Edit ${_escapeHtml(expense.description || expense.category)}"
        >Edit</button>
        <button
          type="button"
          class="btn btn-ghost btn-danger-ghost"
          data-id="${_escapeHtml(expense.id)}"
          data-action="delete"
          aria-label="Delete ${_escapeHtml(expense.description || expense.category)} ${_escapeHtml(formatCurrency(expense.amount))}"
        >Delete</button>
      </td>
    </tr>`.trim();
}

/**
 * Build the HTML for a single expense card (mobile layout).
 *
 * @param {import('./types').Expense} expense
 * @returns {string}
 */
function buildExpenseCard(expense) {
  const descHtml = expense.description
    ? `<p class="expense-card__description">${_escapeHtml(expense.description)}</p>`
    : "";
  return `
    <div class="expense-card">
      <div class="expense-card__header">
        <span class="expense-card__amount">${_escapeHtml(formatCurrency(expense.amount))}</span>
        <div class="expense-card__actions">
          <button
            type="button"
            class="btn btn-ghost"
            data-id="${_escapeHtml(expense.id)}"
            data-action="edit"
            aria-label="Edit ${_escapeHtml(expense.description || expense.category)}"
          >Edit</button>
          <button
            type="button"
            class="btn btn-ghost btn-danger-ghost"
            data-id="${_escapeHtml(expense.id)}"
            data-action="delete"
            aria-label="Delete ${_escapeHtml(expense.description || expense.category)} ${_escapeHtml(formatCurrency(expense.amount))}"
          >Delete</button>
        </div>
      </div>
      <div class="expense-card__meta">
        <span class="category-badge">${_escapeHtml(expense.category)}</span>
        <span class="expense-card__date">${_escapeHtml(formatDate(expense.date))}</span>
      </div>
      ${descHtml}
    </div>`.trim();
}

/**
 * Escape a string for safe use inside HTML attribute values and text nodes.
 *
 * @param {string} str
 * @returns {string}
 */
function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the HTML for a recent-expense row used in the Dashboard.
 *
 * @param {import('./types').Expense} expense
 * @returns {string}
 */
function buildDashboardRow(expense) {
  const desc = expense.description
    ? `<span class="expense-card__description">${_escapeHtml(expense.description)}</span>`
    : "";
  return `
    <div class="expense-card">
      <div class="expense-card__header">
        <span class="expense-card__amount">${_escapeHtml(formatCurrency(expense.amount))}</span>
      </div>
      <div class="expense-card__meta">
        <span class="category-badge">${_escapeHtml(expense.category)}</span>
        <span class="expense-card__date">${_escapeHtml(formatDate(expense.date))}</span>
      </div>
      ${desc}
    </div>`.trim();
}

/** Render the entire dashboard section from current state. */
export function renderDashboard(state) {
  // --- Total amount ---
  const totalEl = document.getElementById("dashboard-total");
  if (totalEl) {
    const total = calcTotal(state.expenses);
    totalEl.textContent = formatCurrency(total);
  }

  // --- Recent expenses ---
  const recentEl = document.getElementById("dashboard-recent");
  if (!recentEl) return;

  const recent = sortDashboardRecent(state.expenses);

  if (recent.length === 0) {
    recentEl.innerHTML = `
      <div class="empty-state" role="status">
        <p class="empty-state__title">No expenses recorded yet.</p>
        <p class="empty-state__body">Add your first expense using the form on the Expenses page.</p>
      </div>`.trim();
    return;
  }

  recentEl.innerHTML = recent.map(buildDashboardRow).join("\n");
}

/** Render the expense list, search bar, filter control, and total. */
export function renderExpenseList(state) {
  // --- Compute visible + sorted expenses ---
  const visible = sortExpenseList(getVisibleExpenses(state));

  // --- Update total ---
  const listTotalEl = document.getElementById("list-total");
  if (listTotalEl) {
    listTotalEl.textContent = formatCurrency(calcTotal(visible));
  }

  // --- Update the filter <select> to reflect current filter value ---
  const filterSelect = document.getElementById("category-filter");
  if (filterSelect) {
    filterSelect.value = state.filter || "All";
  }

  // --- Update the search input to reflect current search value ---
  const searchInput = document.getElementById("search-input");
  if (searchInput && searchInput !== document.activeElement) {
    searchInput.value = state.search || "";
  }

  // --- Render expense list container ---
  const listEl = document.getElementById("expense-list");
  if (!listEl) return;

  if (visible.length === 0) {
    const hasExpenses = state.expenses.length > 0;
    const isFiltered =
      (state.filter && state.filter !== "All") ||
      (state.search && state.search.trim() !== "");
    const message =
      hasExpenses && isFiltered
        ? "No expenses match the current filter."
        : "No expenses recorded yet.";

    listEl.innerHTML = `
      <div class="empty-state" role="status">
        <p class="empty-state__title">${message}</p>
      </div>`.trim();
    return;
  }

  // Single responsive table layout — CSS handles stacking at mobile breakpoints.
  // Using one layout avoids duplicate action buttons in the DOM, which ensures
  // Playwright locators reliably resolve to the single visible button.
  const tableRows = visible.map(buildTableRow).join("\n");

  listEl.innerHTML = `
    <div class="expense-table-wrapper" aria-label="Expense table">
      <table class="expense-table" aria-label="All expenses">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Category</th>
            <th scope="col">Description</th>
            <th scope="col" class="col-amount">Amount</th>
            <th scope="col" class="col-actions"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>`.trim();
}

/** Render the expense entry/edit form. */
export function renderForm(state) {
  const amountInput = document.getElementById("amount-input");
  const categoryInput = document.getElementById("category-input");
  const dateInput = document.getElementById("date-input");
  const descriptionInput = document.getElementById("description-input");
  const formTitle = document.getElementById("form-title");
  const cancelBtn = document.getElementById("cancel-btn");
  const saveBtn = document.getElementById("save-btn");
  const categoryFilter = document.getElementById("category-filter");

  // --- Populate category <select> options (form) ---
  if (categoryInput) {
    // Only rebuild if options are not already populated
    const hasOptions = categoryInput.querySelectorAll("option[value]:not([value=''])").length > 0;
    if (!hasOptions) {
      const placeholder = `<option value="">Select a category</option>`;
      const options = CATEGORIES.map(
        (cat) => `<option value="${_escapeHtml(cat)}">${_escapeHtml(cat)}</option>`
      ).join("");
      categoryInput.innerHTML = placeholder + options;
    }
  }

  // --- Populate category filter <select> with "All" + CATEGORIES ---
  if (categoryFilter) {
    const hasOptions = categoryFilter.querySelectorAll("option").length > 0;
    if (!hasOptions) {
      const allOption = `<option value="All">All</option>`;
      const options = CATEGORIES.map(
        (cat) => `<option value="${_escapeHtml(cat)}">${_escapeHtml(cat)}</option>`
      ).join("");
      categoryFilter.innerHTML = allOption + options;
    }
    categoryFilter.value = state.filter || "All";
  }

  // Clear any existing inline validation errors
  ["amount-error", "category-error", "date-error", "description-error"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  // Remove invalid class from inputs
  [amountInput, categoryInput, dateInput, descriptionInput].forEach((el) => {
    if (el) el.classList.remove("is-invalid");
  });

  if (state.editingId) {
    // --- Edit mode: populate fields from existing expense ---
    const expense = state.expenses.find((e) => e.id === state.editingId);
    if (!expense) {
      // Expense not found — fall back to blank form
      _clearForm({ amountInput, categoryInput, dateInput, descriptionInput, formTitle, cancelBtn, saveBtn });
      return;
    }

    if (formTitle) formTitle.textContent = "Edit Expense";
    if (saveBtn) saveBtn.textContent = "Save Changes";
    if (cancelBtn) cancelBtn.hidden = false;

    if (amountInput) amountInput.value = expense.amount;
    if (categoryInput) categoryInput.value = expense.category;
    if (dateInput) dateInput.value = expense.date;
    if (descriptionInput) descriptionInput.value = expense.description || "";
  } else {
    // --- Add mode: clear all fields, pre-populate date with today ---
    _clearForm({ amountInput, categoryInput, dateInput, descriptionInput, formTitle, cancelBtn, saveBtn });
  }
}

/**
 * Reset the form fields to their default (add-mode) state.
 *
 * @param {{ amountInput, categoryInput, dateInput, descriptionInput, formTitle, cancelBtn, saveBtn }} els
 */
function _clearForm({ amountInput, categoryInput, dateInput, descriptionInput, formTitle, cancelBtn, saveBtn }) {
  if (formTitle) formTitle.textContent = "Add Expense";
  if (saveBtn) saveBtn.textContent = "Save";
  if (cancelBtn) cancelBtn.hidden = true;

  if (amountInput) amountInput.value = "";
  if (categoryInput) categoryInput.value = "";
  if (descriptionInput) descriptionInput.value = "";
  if (dateInput) dateInput.value = todayISO();
}

/**
 * Active toast timer handle — stored so repeated calls cancel the previous timer.
 * @type {ReturnType<typeof setTimeout> | null}
 */
let _toastTimer = null;

/** Show a toast notification with the given message, then hide after 3 s. */
export function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  // Cancel any in-flight hide timer
  if (_toastTimer !== null) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }

  // Set content and make visible
  toast.textContent = message;
  toast.removeAttribute("hidden");

  // Allow the browser to paint the "hidden removed" frame before adding the
  // transition class, so the CSS opacity transition actually fires.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });
  });

  _toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    // Wait for the CSS transition to finish before re-adding [hidden]
    const onTransitionEnd = () => {
      toast.setAttribute("hidden", "");
      toast.removeEventListener("transitionend", onTransitionEnd);
      _toastTimer = null;
    };
    toast.addEventListener("transitionend", onTransitionEnd);
  }, 3000);
}

/** Show or hide the storage-unavailable banner. */
export function showStorageBanner(visible) {
  const banner = document.getElementById("storage-banner");
  if (!banner) return;
  if (visible) {
    banner.removeAttribute("hidden");
  } else {
    banner.setAttribute("hidden", "");
  }
}
