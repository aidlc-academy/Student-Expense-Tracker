/**
 * events.js — event delegation and UI wiring
 *
 * Wires all user interactions via event delegation on stable ancestor elements.
 * Implements tasks 9.1 and 9.2.
 *
 * Responsibilities:
 *  9.1 — form submit, edit, cancel, delete (with confirmation dialog)
 *  9.2 — category filter, search (debounced), hash routing, storage-error banner
 */

import {
  getState,
  addExpense,
  editExpense,
  deleteExpense,
  setFilter,
  setSearch,
  setEditingId,
} from "./state.js";

import { isStorageAvailable } from "./storage.js";

import {
  renderDashboard,
  renderExpenseList,
  renderForm,
  showToast,
  showStorageBanner,
} from "./render.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Display inline validation errors adjacent to their form fields.
 *
 * @param {Record<string, string>} errors — map of fieldName → error message
 */
function _showFieldErrors(errors) {
  // Clear any previous errors first
  ["amount-error", "category-error", "date-error", "description-error"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    }
  );

  const fieldMap = {
    amount: "amount-error",
    category: "category-error",
    date: "date-error",
    description: "description-error",
  };

  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.getElementById(fieldMap[field]);
    if (errorEl) {
      errorEl.textContent = message;
    }
    // Mark the corresponding input as invalid for styling
    const fieldIds = {
      amount: "amount-input",
      category: "category-input",
      date: "date-input",
      description: "description-input",
    };
    const inputEl = document.getElementById(fieldIds[field]);
    if (inputEl) inputEl.classList.add("is-invalid");
  });
}

/**
 * Read the current form field values into a plain object.
 *
 * @returns {{ amount: string, category: string, date: string, description: string }}
 */
function _readFormFields() {
  return {
    amount: document.getElementById("amount-input")?.value ?? "",
    category: document.getElementById("category-input")?.value ?? "",
    date: document.getElementById("date-input")?.value ?? "",
    description: document.getElementById("description-input")?.value ?? "",
  };
}

// ---------------------------------------------------------------------------
// Task 9.1 — form submit, edit, cancel, delete
// ---------------------------------------------------------------------------

/**
 * Wire the expense entry form (add + edit) submission.
 */
function _wireFormSubmit() {
  const form = document.getElementById("expense-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const fields = _readFormFields();
    const state = getState();
    let result;

    if (state.editingId) {
      result = editExpense(state.editingId, fields);
    } else {
      result = addExpense(fields);
    }

    if (!result.success) {
      _showFieldErrors(result.errors ?? {});
      return;
    }

    // Success — clear edit mode then re-render affected regions
    setEditingId(null);
    const newState = getState();
    renderForm(newState);
    renderExpenseList(newState);
    renderDashboard(newState);

    const message = state.editingId ? "Expense updated." : "Expense added.";
    showToast(message);
  });
}

/**
 * Wire Edit and Delete button clicks inside the expense list (event delegation).
 * Also handles clicks on mobile expense cards.
 */
function _wireExpenseListActions() {
  const expenseList = document.getElementById("expense-list");
  if (!expenseList) return;

  expenseList.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;

    if (action === "edit") {
      setEditingId(id);
      renderForm(getState());
      // Scroll form into view so the user can see it
      document.getElementById("expense-form")?.scrollIntoView({ behavior: "smooth" });
    }

    if (action === "delete") {
      const expense = getState().expenses.find((e) => e.id === id);
      if (!expense) return;

      // Populate and open the confirmation dialog
      const dialogDetail = document.getElementById("confirm-dialog-detail");
      if (dialogDetail) {
        const amount = expense.amount.toFixed(2);
        const desc = expense.description
          ? `"${expense.description}"`
          : `a ${expense.category} expense`;
        dialogDetail.textContent = `${desc} — ₹ ${amount}`;
      }

      const dialog = /** @type {HTMLDialogElement} */ (
        document.getElementById("confirm-dialog")
      );
      if (dialog) {
        // Store the id on the dialog so the confirm handler can retrieve it
        dialog.dataset.pendingId = id;
        // Store the triggering button so focus can be returned on close
        dialog.dataset.triggerSelector = `button[data-action="delete"][data-id="${CSS.escape(id)}"]`;
        dialog.showModal();
        // Move focus explicitly to the confirm (primary) button for keyboard/screen-reader users
        const confirmBtn = document.getElementById("confirm-delete-btn");
        if (confirmBtn) confirmBtn.focus();
      }
    }
  });
}

/**
 * Wire the Cancel edit button.
 */
function _wireCancelEdit() {
  const cancelBtn = document.getElementById("cancel-btn");
  if (!cancelBtn) return;

  cancelBtn.addEventListener("click", () => {
    setEditingId(null);
    renderForm(getState());
  });
}

/**
 * Wire the delete-confirmation dialog buttons (Confirm and Cancel).
 */
function _wireConfirmDialog() {
  const dialog = document.getElementById("confirm-dialog");
  if (!dialog) return;

  /**
   * Return focus to the button that originally triggered the dialog.
   * If the expense was deleted the button no longer exists, so fall back to
   * the expense-list container which is always in the DOM.
   */
  function _returnFocus() {
    const selector = /** @type {HTMLElement} */ (dialog).dataset.triggerSelector;
    const trigger = selector ? document.querySelector(selector) : null;
    if (trigger) {
      trigger.focus();
    } else {
      // Expense was deleted — focus the list region as a sensible fallback
      const listEl = document.getElementById("expense-list");
      if (listEl) listEl.focus();
    }
  }

  // Confirm delete
  const confirmBtn = document.getElementById("confirm-delete-btn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      const id = /** @type {HTMLElement} */ (dialog).dataset.pendingId;
      if (!id) return;

      // Clear pendingId before close so the 'close' event handler knows
      // the deletion path already handled focus return
      delete /** @type {HTMLElement} */ (dialog).dataset.pendingId;

      deleteExpense(id);
      dialog.close();

      const newState = getState();
      renderExpenseList(newState);
      renderDashboard(newState);
      showToast("Expense deleted.");

      // Trigger button no longer exists after deletion — return focus to list
      const listEl = document.getElementById("expense-list");
      if (listEl) listEl.focus();
    });
  }

  // Cancel delete
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      // Clear pendingId before close so the 'close' handler knows
      // the cancel path already handled focus return
      delete /** @type {HTMLElement} */ (dialog).dataset.pendingId;
      dialog.close();
      _returnFocus();
    });
  }

  // Also handle the dialog's native close event (e.g. Escape key)
  dialog.addEventListener("close", () => {
    // Only return focus if we haven't already done so via the button handlers above.
    // Check whether a pending id still exists — if it does the dialog was closed
    // via Escape (not via a button), so we need to return focus.
    if (/** @type {HTMLElement} */ (dialog).dataset.pendingId) {
      _returnFocus();
      delete /** @type {HTMLElement} */ (dialog).dataset.pendingId;
    }
  });
}

// ---------------------------------------------------------------------------
// Task 9.2 — filter, search, hash routing, storage-error
// ---------------------------------------------------------------------------

/**
 * Wire the category filter <select> change event.
 * Req 5.1–5.6: selecting a category restricts the visible expense list.
 */
function _wireCategoryFilter() {
  const filterSelect = document.getElementById("category-filter");
  if (!filterSelect) return;

  filterSelect.addEventListener("change", () => {
    setFilter(filterSelect.value);
    renderExpenseList(getState());
  });
}

/**
 * Wire the search input with a 16 ms debounce.
 * Req 6.1–6.6: typing into the search box filters expenses by description,
 * case-insensitively, within 300 ms.
 *
 * Max 200 characters is enforced via the `maxlength` HTML attribute and also
 * enforced here in the event handler as a belt-and-braces guard.
 */
function _wireSearchInput() {
  const searchInput = document.getElementById("search-input");
  if (!searchInput) return;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let debounceTimer = null;

  searchInput.addEventListener("input", () => {
    // Belt-and-braces: enforce 200-char max even if the HTML attribute is bypassed
    let value = searchInput.value;
    if (value.length > 200) {
      value = value.slice(0, 200);
      searchInput.value = value;
    }

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      setSearch(value);
      renderExpenseList(getState());
    }, 16);
  });
}

/**
 * Determine which section (#dashboard or #expenses) should be visible based
 * on the current `window.location.hash`.
 *
 * @returns {"dashboard" | "expenses"}
 */
function _activeView() {
  return window.location.hash === "#expenses" ? "expenses" : "dashboard";
}

/**
 * Apply the correct visibility to the two section elements.
 *
 * @param {"dashboard" | "expenses"} view
 */
function _applyHashRoute(view) {
  const dashboardSection = document.getElementById("dashboard");
  const expensesSection = document.getElementById("expenses");

  if (dashboardSection && expensesSection) {
    if (view === "expenses") {
      dashboardSection.hidden = true;
      expensesSection.hidden = false;
    } else {
      dashboardSection.hidden = false;
      expensesSection.hidden = true;
    }
  }

  // Re-render form when landing on the expenses view so the date defaults to
  // today and the category <select> is populated (Req 3.6, 1.7)
  if (view === "expenses") {
    renderForm(getState());
  }
}

/**
 * Wire hash-based routing (Req 8.6).
 * Toggles `hidden` on #dashboard / #expenses sections; calls renderForm when
 * navigating to #expenses.
 */
function _wireHashRouting() {
  // Apply routing whenever the hash changes
  window.addEventListener("hashchange", () => {
    _applyHashRoute(_activeView());
  });

  // Apply the correct initial view on page load
  _applyHashRoute(_activeView());
}

/**
 * Wire the `storage:error` custom event (fired by storage.js on write failure)
 * and check isStorageAvailable() at startup.
 * Req 10.3: inform the user when data cannot be saved.
 */
function _wireStorageErrors() {
  // Custom event from storage.js (write failure or parse failure)
  document.addEventListener("storage:error", () => {
    showStorageBanner(true);
  });

  // Startup check — if storage is unavailable right from the start, show banner
  if (!isStorageAvailable()) {
    showStorageBanner(true);
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Attach all event listeners for the application.
 * Called once by app.js after the initial render.
 */
export function wireEvents() {
  // 9.1 — form and list interactions
  _wireFormSubmit();
  _wireExpenseListActions();
  _wireCancelEdit();
  _wireConfirmDialog();

  // 9.2 — filter, search, routing, storage errors
  _wireCategoryFilter();
  _wireSearchInput();
  _wireHashRouting();
  _wireStorageErrors();
}
