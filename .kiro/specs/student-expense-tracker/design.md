# Design Document — Student Expense Tracker

## Overview

The Student Expense Tracker is a single-page application (SPA) built with vanilla HTML, CSS, and JavaScript. It requires no build tools, no frameworks, and no server — the user opens `index.html` directly in any modern browser. All expense data is persisted in `localStorage` so records survive page refreshes and browser restarts.

The design centres on a small, self-contained module system: each concern (storage, validation, state, rendering, events) lives in its own JS file. A lightweight in-memory state object acts as the single source of truth; every user action mutates state, persists it, and then triggers a re-render of only the affected UI region. This keeps the data flow predictable without requiring a virtual DOM or reactive framework.

---

## Architecture

### High-Level Structure

```
index.html          ← single HTML shell; contains all view containers
css/
  styles.css        ← design tokens, layout, component styles
js/
  storage.js        ← localStorage read/write abstraction
  model.js          ← Expense factory, validation logic
  state.js          ← in-memory state + mutation functions
  render.js         ← pure rendering functions (state → DOM)
  events.js         ← event delegation and UI wiring
  app.js            ← bootstrap: load → init state → render
```

### Data Flow

```
User Action
    │
    ▼
events.js  ──► model.js (validate)
    │                │
    │         validation error?
    │              yes → render.js (show error)
    │              no  ↓
    ▼
state.js (mutate in-memory state)
    │
    ├──► storage.js (persist to localStorage, async-safe)
    │
    └──► render.js (re-render affected view regions)
```

No global mutable variables are scattered across files. Only `state.js` owns mutable data; every other module receives what it needs as function arguments.

### Navigation Model

The app uses a hash-based routing scheme (`#dashboard`, `#expenses`) to allow bookmarking and browser back/forward without a server. Two named `<section>` containers exist in `index.html`; the router toggles `hidden` attributes to show the active view. No full page reload occurs.

```
#dashboard  (default)  →  Dashboard view
#expenses              →  Expense List view
```

---

## Components and Interfaces

### `storage.js`

```js
// Load all expenses from localStorage. Returns [] if absent or corrupt.
loadExpenses(): Expense[]

// Write the full expense array to localStorage.
saveExpenses(expenses: Expense[]): void

// Returns true if localStorage is available and writable.
isStorageAvailable(): boolean
```

`saveExpenses` wraps the call in a try/catch and fires a custom `storage:error` DOM event if the write fails, which `events.js` listens to and surfaces as a user-visible banner.

### `model.js`

```js
// Create a new Expense with a generated id and createdAt timestamp.
createExpense(fields: ExpenseFields): Expense

// Return a new Expense with updated fields and an updated lastModified timestamp.
updateExpense(existing: Expense, fields: ExpenseFields): Expense

// Validate raw form inputs. Returns { valid: boolean, errors: FieldErrors }.
validateExpenseFields(fields: ExpenseFields): ValidationResult
```

Validation is pure: no side-effects, no DOM access. `validateExpenseFields` checks all constraints from requirements 1 and 3 (required fields, amount range, date range, description length).

### `state.js`

```js
// Initialise state from localStorage.
initState(): void

// Return a shallow copy of the current state (prevents external mutation).
getState(): AppState

// Mutate functions — each returns void; callers invoke render after.
addExpense(fields: ExpenseFields): void
editExpense(id: string, fields: ExpenseFields): void
deleteExpense(id: string): void
setFilter(category: string): void          // "All" or a Category name
setSearch(term: string): void
setEditingId(id: string | null): void
```

### `render.js`

```js
// Render the entire dashboard section from current state.
renderDashboard(state: AppState): void

// Render the expense list, search bar, filter control, and total.
renderExpenseList(state: AppState): void

// Render the expense entry/edit form (populates fields when editing).
renderForm(state: AppState): void

// Show/hide a toast notification.
showToast(message: string): void

// Show/hide the storage-unavailable banner.
showStorageBanner(visible: boolean): void
```

All render functions read from a state snapshot passed as an argument — they never reach into `state.js` themselves. This makes them trivially testable.

### `events.js`

Wires all user interactions via event delegation on stable ancestor elements. Responsibilities:

- Form submit → validate → add or edit expense → render + toast
- Edit button click → `setEditingId` → `renderForm`
- Delete button click → show confirmation dialog → on confirm, `deleteExpense` → render + toast
- Filter change → `setFilter` → `renderExpenseList`
- Search input → debounced (16 ms, for ≤300 ms budget) → `setSearch` → `renderExpenseList`
- Hash change → show/hide view sections
- `storage:error` custom event → `showStorageBanner`

### `app.js`

Entry point loaded last via `<script defer>`. Calls `initState()`, sets up hash routing, renders both sections, then calls `events.js` to attach all listeners.

---

## Data Models

### Expense Object

```js
{
  id:           string,   // UUID v4, generated at creation time
  amount:       number,   // Positive float, 0.01–999,999.99 (2 d.p. enforced on save)
  category:     string,   // One of the predefined Category values (see below)
  description:  string,   // Free text, 0–250 characters
  date:         string,   // ISO 8601 date string "YYYY-MM-DD"
  createdAt:    number,   // Unix timestamp (ms) — used for same-day ordering
  lastModified: number    // Unix timestamp (ms) — used for dashboard recency sort
}
```

### Predefined Categories

```js
const CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Other"];
```

### AppState Object

```js
{
  expenses:   Expense[],  // Master list in insertion order (sort applied at render time)
  filter:     string,     // "All" or a Category name
  search:     string,     // Current search term (empty string = no search)
  editingId:  string|null // id of Expense being edited, or null
}
```

### ValidationResult

```js
{
  valid:  boolean,
  errors: {
    amount?:      string,
    category?:    string,
    description?: string,
    date?:        string
  }
}
```

### localStorage Schema

Key: `"student-expense-tracker:expenses"`  
Value: `JSON.stringify(Expense[])` — a JSON-serialised array of Expense objects.

On load, `storage.js` attempts `JSON.parse`; if parsing throws, the corrupted value is discarded and the tracker starts fresh, displaying the storage-unavailable banner.

---

## UI Layout and Navigation

### Dashboard (`#dashboard`)

```
┌─────────────────────────────────────────┐
│  Student Expense Tracker          [nav] │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │  Total Amount Spent              │   │
│  │  ₹ 0.00  (or $ 0.00)            │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Recent Expenses (last 5)               │
│  ┌──────────────────────────────────┐   │
│  │  [Date] [Category] [Desc] [Amt]  │   │
│  │  ...                             │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [ View All Expenses → ]                │
└─────────────────────────────────────────┘
```

### Expense List (`#expenses`)

```
┌─────────────────────────────────────────┐
│  Student Expense Tracker          [nav] │
├─────────────────────────────────────────┤
│  ┌─── Add / Edit Expense ────────────┐  │
│  │  Amount  Category  Date           │  │
│  │  Description              [Save]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Search…]         [Filter: All ▾]      │
│                                         │
│  Total Amount Spent: ₹ 0.00             │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Date | Category | Desc | Amt    │   │
│  │  [Edit] [Delete]                 │   │
│  │  ...                             │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Layout change |
|---|---|
| 375 px (mobile) | Single column; table collapses to card layout |
| 768 px (tablet) | Two-column form; table layout restored |
| 1280 px (desktop) | Centred max-width container (1100 px) |

### Accessibility

- All form fields have explicit `<label>` elements with `for`/`id` pairing.
- Error messages use `role="alert"` so screen readers announce them immediately.
- Toast notifications use `aria-live="polite"`.
- Delete confirmation uses a native `<dialog>` element with focus management.
- All interactive controls meet the 44 × 44 CSS pixel touch-target minimum.
- Colour tokens are chosen to satisfy WCAG 2.1 Level AA contrast ratios (≥ 4.5:1 for normal text, ≥ 3:1 for large text and UI components).

---

## State Management Approach

State is a single plain JS object owned by `state.js`. The pattern is:

1. **Mutate** — a state function updates the in-memory object.
2. **Persist** — `storage.js.saveExpenses` is called synchronously within the same mutation function, completing within the 300 ms budget for all realistic expense-array sizes (localStorage writes of a few KB are sub-millisecond).
3. **Render** — the caller (in `events.js`) calls the appropriate `render.*` function with a fresh snapshot of state.

There is no batching, no virtual DOM diffing, and no async queue. For a single-user, in-browser application this is sufficient and keeps the code easy to reason about.

**Derived data** (filtered + searched expense list, total amount, dashboard top-5) is computed fresh inside each render function from the state snapshot. This avoids cached-derived-state bugs and is fast enough given the expected data volume (hundreds of expenses at most).

**Sort order** is also applied at render time:
- Expense List: `date` descending; ties broken by `createdAt` descending.
- Dashboard recent list: `lastModified` descending; ties broken by `id` descending (lexicographic UUID comparison provides a stable, deterministic order).

---

## localStorage Persistence Strategy

```
Key:   "student-expense-tracker:expenses"
Value: JSON string of Expense[]
```

- **Write**: Called synchronously after every add, edit, or delete. The write path is `JSON.stringify` + `localStorage.setItem`, which completes well within 300 ms for any realistic payload.
- **Read**: Called once at app startup. Output is validated structurally (must be an array; each element must have required fields). Invalid or absent data silently defaults to `[]`.
- **Error handling**: `localStorage` may be unavailable (private browsing in some browsers, storage quota exceeded). All writes are wrapped in `try/catch`; on failure, a persistent banner informs the user that data cannot be saved.
- **No versioning scheme in v1**: The schema is simple enough that migrations are not needed. If the schema evolves in a future version, a `schemaVersion` field can be added.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Serialisation round-trip preserves all fields

*For any* valid array of Expense objects, serialising to JSON and deserialising the resulting string SHALL produce an array where each object has identical `id`, `amount`, `category`, `description`, and `date` field values to the corresponding object in the original array.

**Validates: Requirements 10.5**

---

### Property 2: Valid expense submission grows the expense list by exactly one

*For any* existing expense list and any set of form inputs that passes validation, submitting the add-expense form SHALL result in the expense list length increasing by exactly one, and the new expense SHALL appear in the list.

**Validates: Requirements 1.2**

---

### Property 3: Whitespace-only and empty descriptions are treated as empty (optional field)

*For any* expense submission where the description field contains only whitespace characters, the saved Expense SHALL store a trimmed description (empty string or whitespace stripped), and the submission SHALL succeed provided all other required fields are valid.

**Validates: Requirements 1.1, 1.3**

---

### Property 4: Invalid inputs are always rejected without mutating state

*For any* combination of form inputs that fails at least one validation rule (missing required field, amount out of range, date too far in future, description too long), submitting the form SHALL leave the expense list unchanged and SHALL display at least one validation error message.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6, 3.4, 3.5**

---

### Property 5: Filter correctness — all visible expenses match the selected category

*For any* expense list and any selected category (not "All"), every expense visible in the filtered Expense List SHALL have a `category` field that exactly equals the selected category, and no expense with a different category SHALL appear.

**Validates: Requirements 5.2, 5.3**

---

### Property 6: Search filter correctness — all visible expenses contain the search term

*For any* expense list and any non-empty search term, every expense visible in the filtered Expense List SHALL have a `description` field that contains the search term evaluated case-insensitively, and no expense whose description does not contain the term SHALL appear.

**Validates: Requirements 6.2, 6.3**

---

### Property 7: Combined filter and search — conjunction is correctly applied

*For any* expense list with both a category filter and a search term active, every visible expense SHALL satisfy both constraints simultaneously (category matches AND description contains search term). No expense that fails either constraint SHALL appear.

**Validates: Requirements 5.5**

---

### Property 8: Total amount equals sum of visible expenses

*For any* state (including any active filter and/or search), the displayed Total Amount SHALL equal the arithmetic sum of the `amount` fields of all currently visible expenses, rounded to two decimal places. When no expenses are visible, the total SHALL be 0.00.

**Validates: Requirements 5.4, 6.4, 7.2, 7.3**

---

### Property 9: Expense list ordering — date descending, ties broken by createdAt

*For any* expense list, after rendering the Expense List view, every adjacent pair of expenses (i, i+1) SHALL satisfy: `expense[i].date >= expense[i+1].date`; and when `expense[i].date === expense[i+1].date`, `expense[i].createdAt >= expense[i+1].createdAt`.

**Validates: Requirements 2.2**

---

### Property 10: Dashboard shows the five most recently modified expenses

*For any* expense list containing five or more expenses, the Dashboard recent-expenses section SHALL display exactly the five expenses with the largest `lastModified` values, ordered by `lastModified` descending.

**Validates: Requirements 8.3, 8.4**

---

## Error Handling

| Scenario | Detection | User Feedback | State Effect |
|---|---|---|---|
| Required field missing | `validateExpenseFields` | Inline error per field (`role="alert"`) | No mutation |
| Amount out of range | `validateExpenseFields` | Inline error on amount field | No mutation |
| Date > 365 days future | `validateExpenseFields` | Inline error on date field | No mutation |
| Description > 250 chars | `validateExpenseFields` | Inline error on description field | No mutation |
| localStorage unavailable | `isStorageAvailable()` at startup | Persistent top-of-page banner | App still usable in-session |
| localStorage write failure | `try/catch` in `saveExpenses` | Persistent top-of-page banner | In-memory state updated; not persisted |
| Corrupt localStorage data | `JSON.parse` throws | Silent reset to `[]`; banner shown | Fresh empty state |

All error messages use plain language and identify the specific field or action that failed.

---

## Testing Strategy

### Unit Tests (example-based)

Written with plain Jest (or a zero-config alternative such as `node:test` for a no-build project).

Focus areas:
- `validateExpenseFields` — one test per validation rule with representative valid and invalid inputs.
- `createExpense` / `updateExpense` — verify field assignment and timestamp generation.
- `loadExpenses` / `saveExpenses` — mock `localStorage`; verify round-trip and error paths.
- Sort and filter logic extracted from `render.js` into pure helper functions — verify ordering and filtering with small concrete arrays.
- Total amount calculation — a few examples including zero expenses, single expense, and mixed-category filtered list.

### Property-Based Tests

Use **fast-check** (runs in Node; no browser required) to generate random inputs and verify the correctness properties above. Each test runs a minimum of **100 iterations**.

Tag format for traceability:

```
// Feature: student-expense-tracker, Property 1: Serialisation round-trip preserves all fields
```

Property test mapping:

| Property | Test description |
|---|---|
| P1 | Generate random `Expense[]`; serialise → deserialise; deep-equal each field |
| P2 | Generate random valid form inputs + existing list; add expense; assert length grows by 1 and item is present |
| P3 | Generate whitespace-only description strings; assert submission succeeds and trimmed value is stored |
| P4 | Generate invalid form inputs (arbitrary combinations); assert list unchanged and errors non-empty |
| P5 | Generate random expenses + random category; filter; assert all results match category |
| P6 | Generate random expenses + random search term; search; assert all results contain term (case-insensitive) |
| P7 | Generate random expenses + category + term; apply both; assert each result satisfies both constraints |
| P8 | Generate random visible expense sets; assert computed total equals `sum(amounts)` rounded to 2 d.p. |
| P9 | Generate random expense arrays; sort; assert every adjacent pair satisfies date-then-createdAt ordering |
| P10 | Generate random expense lists (≥5); assert dashboard list equals top-5 by `lastModified` |

### Integration / Smoke Tests

- Open `index.html` in a headless browser (Playwright) and verify:
  - Dashboard renders on load with correct total.
  - Adding an expense via the form persists across a page reload.
  - localStorage-unavailable path: mock `localStorage` to throw; verify banner appears.
