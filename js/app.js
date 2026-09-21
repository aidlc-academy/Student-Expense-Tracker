/**
 * app.js — bootstrap: load → init state → render
 *
 * Entry point loaded last via <script type="module" src="js/app.js">.
 * Sequence:
 *   1. Initialise state from localStorage
 *   2. Determine initial view from window.location.hash (default #dashboard)
 *   3. Show the correct section, hide the other
 *   4. Render all view regions
 *   5. Wire all event listeners
 *   6. Show storage banner if localStorage is unavailable
 */

import { initState, getState } from "./state.js";
import { renderDashboard, renderExpenseList, renderForm, showStorageBanner } from "./render.js";
import { isStorageAvailable } from "./storage.js";
import { wireEvents } from "./events.js";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

// 1. Load expenses from localStorage and initialise in-memory state
initState();

// 2. Determine the initial view from the hash; fall back to #dashboard
const hash = window.location.hash;
const showExpenses = hash === "#expenses";

// 3. Show the correct section, hide the other
const dashboardSection = document.getElementById("dashboard");
const expensesSection = document.getElementById("expenses");

if (showExpenses) {
  dashboardSection.hidden = true;
  expensesSection.hidden = false;
} else {
  dashboardSection.hidden = false;
  expensesSection.hidden = true;
}

// 4. Render all view regions from the initial state snapshot
const initialState = getState();
renderDashboard(initialState);
renderExpenseList(initialState);
renderForm(initialState);

// 5. Attach all event listeners (form submit, edit, delete, filter, search, etc.)
wireEvents();

// 6. If localStorage is unavailable, inform the user immediately
if (!isStorageAvailable()) {
  showStorageBanner(true);
}
