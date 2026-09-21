# Implementation Plan: Student Expense Tracker

## Overview

Build a vanilla HTML/CSS/JavaScript single-page application that lets students record, organise, and review personal expenses. The app uses six JS modules (`storage.js`, `model.js`, `state.js`, `render.js`, `events.js`, `app.js`), a single HTML shell, and a CSS file. All data is persisted to `localStorage`. Property-based tests use **fast-check** and integration tests use **Playwright**.

---

## Tasks

- [x] 1. Scaffold project structure and testing infrastructure
  - Create the directory layout: `css/`, `js/`, `tests/unit/`, `tests/e2e/`
  - Create placeholder files: `index.html`, `css/styles.css`, `js/storage.js`, `js/model.js`, `js/state.js`, `js/render.js`, `js/events.js`, `js/app.js`
  - Initialise `package.json` with `"type": "module"`, add **fast-check**, **jest** (with `--experimental-vm-modules`), and **Playwright** as dev dependencies
  - Add npm scripts: `"test:unit"`, `"test:e2e"`, `"test"`
  - Create `jest.config.js` configured for ESM and pointing at `tests/unit/`
  - Create `playwright.config.js` pointing at `tests/e2e/` with a `baseURL` of the project root served via `npx serve` or similar
  - _Requirements: all (infrastructure only)_

- [x] 2. Implement CSS design tokens and base styles
  - [x] 2.1 Define design tokens and global styles in `css/styles.css`
    - Declare CSS custom properties for colour palette (primary, surface, error, text), font family, font sizes, spacing scale, and border-radius
    - Write a CSS reset (`box-sizing: border-box`, margin/padding zero on `*`)
    - Write base `body` styles: font family, background colour, line-height
    - Ensure all colour pairings meet WCAG 2.1 AA contrast ratios (≥ 4.5:1 normal text, ≥ 3:1 large text / UI components)
    - _Requirements: 9.1, 9.4_
  - [x] 2.2 Implement layout, component, and responsive styles
    - Write header / nav bar styles
    - Write card/panel styles for summary area and form container
    - Write table and card-layout styles for the expense list
    - Write form input, select, button, and label styles; ensure all interactive controls are at least 44 × 44 CSS pixels
    - Write toast notification and storage-unavailable banner styles
    - Write confirmation dialog styles
    - Write empty-state message styles
    - Write responsive breakpoints: 375 px (card layout, single column), 768 px (table restored, two-column form), 1280 px (centred 1100 px container)
    - Ensure no horizontal scrollbar or clipped content at 375 px, 768 px, and 1280 px
    - _Requirements: 9.1, 9.3, 9.4, 9.6, 2.4_

- [x] 3. Implement the HTML shell (`index.html`)
  - [x] 3.1 Write the HTML shell with all view containers and semantic structure
    - `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with charset, viewport meta, title, stylesheet link
    - `<header>` with app title and `<nav>` containing hash links `#dashboard` and `#expenses`
    - `<main>` containing two `<section>` elements: `id="dashboard"` and `id="expenses"`; one hidden by default via a `hidden` attribute
    - Inside `#dashboard`: summary card with `id="dashboard-total"`, recent-expenses container `id="dashboard-recent"`, "View All Expenses" link pointing to `#expenses`
    - Inside `#expenses`: expense entry form `id="expense-form"` with labelled fields (amount, category, date, description) and Save / Cancel buttons; search input `id="search-input"`; category filter `<select id="category-filter">`; total summary `id="list-total"`; expense table / list container `id="expense-list"`
    - Add `<dialog id="confirm-dialog">` with confirmation text and Confirm / Cancel buttons
    - Add `<div id="toast" aria-live="polite" role="status">` and `<div id="storage-banner" role="alert">`
    - All form fields paired with `<label for="…">` using explicit `id` attributes; error containers (`role="alert"`) adjacent to each field
    - Load JS modules at end of `<body>` via `<script type="module" src="js/app.js">`
    - _Requirements: 9.2, 9.5, 4.2, 10.2_

- [x] 4. Implement `storage.js` — localStorage abstraction
  - [x] 4.1 Implement `isStorageAvailable`, `loadExpenses`, and `saveExpenses`
    - `isStorageAvailable()`: attempt a test write/read/delete inside `try/catch`; return boolean
    - `loadExpenses()`: read key `"student-expense-tracker:expenses"`, `JSON.parse`; on missing key return `[]`; on parse failure discard value, dispatch `storage:error` custom event, return `[]`
    - `saveExpenses(expenses)`: `JSON.stringify` + `localStorage.setItem` inside `try/catch`; on failure dispatch `storage:error` custom event
    - Export all three functions as named exports
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 4.2 Write property test for serialisation round-trip (Property 1)
    - **Property 1: Serialisation round-trip preserves all fields**
    - Generate random `Expense[]` arrays using fast-check arbitraries; call `saveExpenses` then `loadExpenses` against a mocked localStorage; assert every object has identical `id`, `amount`, `category`, `description`, and `date` values
    - Tag: `// Feature: student-expense-tracker, Property 1: Serialisation round-trip preserves all fields`
    - **Validates: Requirements 10.5**
  - [x] 4.3 Write unit tests for `storage.js`
    - Mock `localStorage` with an in-memory object; test `loadExpenses` with absent key, valid JSON, and corrupt JSON; test `saveExpenses` happy path and quota-exceeded failure; test `isStorageAvailable` true and false paths
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 5. Implement `model.js` — Expense factory and validation
  - [x] 5.1 Implement `createExpense`, `updateExpense`, and `validateExpenseFields`
    - Define `CATEGORIES = ["Food","Transport","Books","Entertainment","Health","Other"]` and export it
    - `createExpense(fields)`: generate UUID v4 via `crypto.randomUUID()`, set `createdAt` and `lastModified` to `Date.now()`, round `amount` to 2 d.p.; return full Expense object
    - `updateExpense(existing, fields)`: return new object merging existing `id` and `createdAt` with new fields and updated `lastModified`; round `amount` to 2 d.p.
    - `validateExpenseFields(fields)`: validate all constraints — amount required and in range 0.01–999,999.99; category required and in `CATEGORIES`; date required and not more than 365 days in future; description max 250 characters; return `{ valid, errors }`
    - Trim description before length check; treat whitespace-only description as empty (valid, store trimmed value)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.4, 3.5_
  - [x] 5.2 Write property test for invalid inputs always rejected (Property 4)
    - **Property 4: Invalid inputs are always rejected without mutating state**
    - Generate arbitrary combinations of form inputs that fail at least one validation rule; call `validateExpenseFields`; assert `valid === false` and `errors` is non-empty
    - Tag: `// Feature: student-expense-tracker, Property 4: Invalid inputs are always rejected without mutating state`
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 3.4, 3.5**
  - [x] 5.3 Write property test for whitespace description accepted (Property 3)
    - **Property 3: Whitespace-only and empty descriptions are treated as empty**
    - Generate whitespace-only description strings combined with valid other fields; call `validateExpenseFields`; assert `valid === true`; call `createExpense` and assert stored description is trimmed
    - Tag: `// Feature: student-expense-tracker, Property 3: Whitespace-only and empty descriptions are treated as empty`
    - **Validates: Requirements 1.1, 1.3**
  - [x] 5.4 Write unit tests for `model.js`
    - Test `validateExpenseFields` with one test per rule: missing amount, amount = 0, amount = 0.001, amount = 1,000,000, date 366 days future, description 251 chars, missing category, invalid category
    - Test `createExpense` assigns a unique `id`, correct `createdAt`/`lastModified`, and rounds amount
    - Test `updateExpense` preserves `id` and `createdAt`, updates `lastModified`, and applies new fields
    - _Requirements: 1.1–1.6, 3.4, 3.5_

- [x] 6. Implement `state.js` — in-memory state and mutation functions
  - [x] 6.1 Implement state initialisation and all mutation functions
    - Define `AppState` shape: `{ expenses: [], filter: "All", search: "", editingId: null }`
    - `initState()`: call `loadExpenses()` and populate `state.expenses`; call `isStorageAvailable()` and flag result
    - `getState()`: return a shallow copy (`{ ...state, expenses: [...state.expenses] }`)
    - `addExpense(fields)`: validate via `model.validateExpenseFields`; on valid, call `createExpense`, push to `state.expenses`, call `saveExpenses`
    - `editExpense(id, fields)`: validate; on valid, find expense by `id`, call `updateExpense`, replace in array, call `saveExpenses`
    - `deleteExpense(id)`: filter out matching `id`, call `saveExpenses`
    - `setFilter(category)`: update `state.filter`
    - `setSearch(term)`: update `state.search`
    - `setEditingId(id)`: update `state.editingId`
    - _Requirements: 1.2, 3.3, 4.3, 5.1, 6.1, 10.1_
  - [x] 6.2 Write property test for valid submission grows list by one (Property 2)
    - **Property 2: Valid expense submission grows the expense list by exactly one**
    - Generate random valid `ExpenseFields` and an existing expense array; call `addExpense`; assert `getState().expenses.length === initial + 1` and the new expense is present
    - Tag: `// Feature: student-expense-tracker, Property 2: Valid expense submission grows the expense list by exactly one`
    - **Validates: Requirements 1.2**
  - [x] 6.3 Write unit tests for `state.js`
    - Test `addExpense` happy path and validation failure (list unchanged)
    - Test `editExpense` happy path, validation failure, and unknown id
    - Test `deleteExpense` removes correct expense and leaves others
    - Test `setFilter`, `setSearch`, `setEditingId` update state correctly
    - _Requirements: 1.2, 3.3, 4.3_

- [x] 7. Implement `render.js` — all rendering functions
  - [x] 7.1 Implement pure helper functions for sorting, filtering, and totalling
    - `getVisibleExpenses(state)`: apply category filter (exact match, or "All") then search filter (case-insensitive `includes`); return filtered array
    - `sortExpenseList(expenses)`: sort by `date` descending; ties by `createdAt` descending; return new sorted array (do not mutate)
    - `sortDashboardRecent(expenses)`: sort by `lastModified` descending; ties by `id` descending (lexicographic); return top-5
    - `calcTotal(expenses)`: sum `amount` fields; round to 2 d.p.; return number
    - `formatCurrency(amount)`: read currency config; return `"₹ X.XX"` or `"$ X.XX"` with exactly 2 d.p.
    - Export all helpers
    - _Requirements: 2.2, 5.2, 5.3, 5.4, 5.5, 6.2, 6.3, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4_
  - [x] 7.2 Write property test for expense list ordering (Property 9)
    - **Property 9: Expense list ordering — date descending, ties broken by createdAt**
    - Generate random expense arrays; call `sortExpenseList`; assert every adjacent pair satisfies `expenses[i].date >= expenses[i+1].date` and when dates are equal `expenses[i].createdAt >= expenses[i+1].createdAt`
    - Tag: `// Feature: student-expense-tracker, Property 9: Expense list ordering — date descending, ties broken by createdAt`
    - **Validates: Requirements 2.2**
  - [x] 7.3 Write property test for dashboard top-5 (Property 10)
    - **Property 10: Dashboard shows the five most recently modified expenses**
    - Generate random expense lists of length ≥ 5; call `sortDashboardRecent`; assert result length is 5 and equals the 5 expenses with the largest `lastModified` values ordered by `lastModified` descending
    - Tag: `// Feature: student-expense-tracker, Property 10: Dashboard shows the five most recently modified expenses`
    - **Validates: Requirements 8.3, 8.4**
  - [x] 7.4 Write property test for filter correctness (Property 5)
    - **Property 5: Filter correctness — all visible expenses match the selected category**
    - Generate random expense arrays and a random category from `CATEGORIES`; call `getVisibleExpenses` with that filter; assert every returned expense has `category === selectedCategory` and no expense with a different category appears
    - Tag: `// Feature: student-expense-tracker, Property 5: Filter correctness — all visible expenses match the selected category`
    - **Validates: Requirements 5.2, 5.3**
  - [x] 7.5 Write property test for search correctness (Property 6)
    - **Property 6: Search filter correctness — all visible expenses contain the search term**
    - Generate random expense arrays and a random non-empty search term; call `getVisibleExpenses` with that search; assert every returned expense's `description.toLowerCase()` contains `term.toLowerCase()` and no non-matching expense appears
    - Tag: `// Feature: student-expense-tracker, Property 6: Search filter correctness — all visible expenses contain the search term`
    - **Validates: Requirements 6.2, 6.3**
  - [x] 7.6 Write property test for combined filter+search (Property 7)
    - **Property 7: Combined filter and search — conjunction is correctly applied**
    - Generate random expenses, a category, and a search term; call `getVisibleExpenses` with both active; assert each returned expense satisfies both constraints and no expense failing either appears
    - Tag: `// Feature: student-expense-tracker, Property 7: Combined filter and search — conjunction is correctly applied`
    - **Validates: Requirements 5.5**
  - [x] 7.7 Write property test for total amount equals sum of visible expenses (Property 8)
    - **Property 8: Total amount equals sum of visible expenses**
    - Generate random visible expense sets (including empty set); call `calcTotal`; assert result equals `Math.round(sum * 100) / 100` of all amounts; assert empty set returns `0.00`
    - Tag: `// Feature: student-expense-tracker, Property 8: Total amount equals sum of visible expenses`
    - **Validates: Requirements 5.4, 6.4, 7.2, 7.3**
  - [x] 7.8 Implement `renderDashboard`, `renderExpenseList`, and `renderForm`
    - `renderDashboard(state)`: call `sortDashboardRecent`, format total with `formatCurrency`, update `#dashboard-total` text, render recent-expense rows in `#dashboard-recent`; show empty-state message when list is empty
    - `renderExpenseList(state)`: call `getVisibleExpenses` → `sortExpenseList`; render rows in `#expense-list` with amount formatted as currency (2 d.p. + symbol), category, description, date as DD/MM/YYYY, Edit and Delete buttons with `data-id` attributes; show empty-state or no-results message when appropriate; update `#list-total`
    - `renderForm(state)`: if `editingId` non-null, populate form fields from matching expense and show Cancel button; else clear all fields and pre-populate date with today's date; populate `<select>` options from `CATEGORIES`; populate filter `<select>` with "All" + `CATEGORIES`
    - `showToast(message)`: set inner text, add visible class, remove after 3 s; use `aria-live="polite"`
    - `showStorageBanner(visible)`: toggle `hidden` on `#storage-banner`
    - _Requirements: 2.1, 2.2, 2.3, 3.2, 7.1, 7.4, 7.5, 8.1–8.7, 9.2, 1.7_
  - [x] 7.9 Write unit tests for render helpers
    - Test `getVisibleExpenses` with "All" filter + empty search, specific category, search term, and both simultaneously
    - Test `sortExpenseList` with same-date ties, empty array, and single item
    - Test `calcTotal` with zero, one, and multiple expenses including floating-point amounts
    - Test `formatCurrency` returns correct symbol and 2 d.p. for both currency configs
    - _Requirements: 2.2, 5.2–5.5, 6.2–6.4, 7.2–7.5_

- [x] 8. Checkpoint — unit tests pass
  - Run `npm run test:unit` and ensure all unit and property tests pass before wiring the UI.
  - Ensure all tests pass; ask the user if questions arise.

- [x] 9. Implement `events.js` — event delegation and UI wiring
  - [x] 9.1 Wire form submit, edit, cancel, and delete events
    - Delegate `submit` on `#expense-form`: read field values, call `addExpense` or `editExpense` via `state.js`, render inline validation errors per field using `role="alert"` containers, on success call `renderForm` + `renderExpenseList` + `renderDashboard` + `showToast`
    - Delegate `click` on Edit buttons (`data-id`): call `setEditingId`, `renderForm`
    - Handle Cancel button `click`: call `setEditingId(null)`, `renderForm`
    - Delegate `click` on Delete buttons (`data-id`): populate `#confirm-dialog` with expense description and amount, call `dialog.showModal()`
    - Wire Confirm button in dialog: call `deleteExpense`, close dialog, render affected regions, `showToast`
    - Wire Cancel button in dialog: call `dialog.close()`
    - _Requirements: 1.2, 1.3, 1.7, 3.1–3.6, 4.1–4.5, 9.2_
  - [x] 9.2 Wire filter, search, hash-routing, and storage-error events
    - `change` on `#category-filter`: call `setFilter`, `renderExpenseList`
    - `input` on `#search-input`: debounce at 16 ms; call `setSearch`, `renderExpenseList`; enforce max 200 characters client-side
    - `hashchange` on `window`: toggle `hidden` on `#dashboard` / `#expenses` sections; call `renderForm` when navigating to `#expenses`
    - `storage:error` custom event on `document`: call `showStorageBanner(true)`
    - `storage:unavailable` path: if `isStorageAvailable()` is false at init, call `showStorageBanner(true)`
    - _Requirements: 5.1–5.6, 6.1–6.6, 8.6, 10.3_

- [x] 10. Implement `app.js` — bootstrap and hash routing
  - [x] 10.1 Implement bootstrap sequence
    - Call `initState()` to load from `localStorage`
    - Determine initial view from `window.location.hash` (default to `#dashboard`)
    - Show correct section; hide the other
    - Call `renderDashboard(getState())`, `renderExpenseList(getState())`, `renderForm(getState())`
    - Call event wiring entry point from `events.js`
    - If `!isStorageAvailable()`, call `showStorageBanner(true)`
    - _Requirements: 8.1, 10.2, 10.3_

- [x] 11. Checkpoint — full manual smoke check
  - Open `index.html` directly in a browser (no server needed)
  - Verify Dashboard loads, form works, add/edit/delete round-trips, filter and search work, localStorage persists across reload
  - Ensure all tests pass; ask the user if questions arise.

- [x] 12. Write Playwright integration and smoke tests
  - [x] 12.1 Write smoke tests for add, reload persistence, and storage-error banner
    - Test: navigate to app, add an expense via the form, reload page, assert expense still appears in Expense List (localStorage persisted)
    - Test: mock `localStorage` to throw on `setItem`; add an expense; assert storage-unavailable banner is visible
    - Test: on first load with no data, Dashboard shows `₹ 0.00` total and empty-state message
    - _Requirements: 10.1, 10.2, 10.3, 8.1, 8.5_
  - [x] 12.2 Write integration tests for edit, delete, filter, and search flows
    - Test: add two expenses, click Edit on the first, modify amount, Save; assert updated amount shown
    - Test: add an expense, click Delete, confirm; assert expense removed from list
    - Test: add expenses in multiple categories, select a category filter; assert only matching expenses shown and total updated
    - Test: add expenses with distinct descriptions, type in search box; assert only matching expenses shown within 300 ms
    - _Requirements: 3.1–3.3, 4.1–4.3, 5.1–5.4, 6.1–6.4_
  - [x] 12.3 Write accessibility integration tests
    - Test: all form inputs have accessible labels (use Playwright's `getByLabel`)
    - Test: error messages are announced (assert `role="alert"` elements become visible on invalid submit)
    - Test: toast appears with `aria-live="polite"` after add action
    - Test: delete confirmation uses `<dialog>` and focus moves into it on open
    - _Requirements: 9.5_

- [x] 13. Accessibility audit and fixes
  - [x] 13.1 Audit and fix semantic HTML and ARIA
    - Verify all form `<input>` and `<select>` elements have `<label for="…">` pairings
    - Verify error containers adjacent to each field use `role="alert"` or `aria-live="assertive"`
    - Verify toast uses `aria-live="polite"`
    - Verify `<dialog>` for delete confirmation moves focus to first interactive element on open and returns focus on close
    - Verify nav links and buttons have descriptive accessible names (no icon-only controls without `aria-label`)
    - Add `aria-label` or `aria-describedby` to Edit and Delete buttons to include the expense they act on (`aria-label="Edit [description]"`)
    - _Requirements: 9.5_
  - [x] 13.2 Verify colour contrast and touch targets
    - Check all text/background pairs against WCAG 2.1 AA thresholds using browser dev tools or axe-core
    - Verify all buttons, inputs, and links render at ≥ 44 × 44 CSS pixels; add padding if any fall short
    - Verify no horizontal scrollbar or overlapping elements at 375 px, 768 px, 1280 px using browser responsive mode
    - _Requirements: 9.3, 9.4, 9.6, 2.4_

- [x] 14. Final checkpoint — all tests pass
  - Run `npm run test` (unit + property + e2e) and confirm full green suite.
  - Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Each task references specific requirements for full traceability
- Property tests use **fast-check** running a minimum of 100 iterations each; they complement rather than replace unit tests
- Integration tests require a static file server (e.g., `npx serve .`) — configure `baseURL` in `playwright.config.js`
- Checkpoints (tasks 8, 11, 14) act as quality gates before advancing to the next phase
- Currency defaults to Indian Rupee (₹) per requirements 7.4; US Dollar ($) support is configuration-driven per requirements 7.5

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8"] },
    { "id": 7, "tasks": ["7.9", "9.1"] },
    { "id": 8, "tasks": ["9.2", "10.1"] },
    { "id": 9, "tasks": ["12.1", "12.2", "13.1"] },
    { "id": 10, "tasks": ["12.3", "13.2"] }
  ]
}
```
