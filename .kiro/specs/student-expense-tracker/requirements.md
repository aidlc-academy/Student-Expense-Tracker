# Requirements Document

## Introduction

The Student Expense Tracker is a web application designed for college students to record, organise, and review their personal spending. Students can add, edit, and delete expenses; categorise and search them; and view summary information through a dashboard. All data is persisted in the browser's local storage so that records survive page refreshes and browser restarts. The application presents a clean, professional user interface that is accessible and straightforward to navigate.

---

## Glossary

- **Expense**: A single spending record consisting of an amount, a category, a description, and a date.
- **Category**: A predefined classification label used to group expenses (e.g., Food, Transport, Books, Entertainment, Health, Other).
- **Dashboard**: The main landing view of the application showing a summary of total spending and a list of the most recent expenses.
- **Expense List**: A view showing all expenses in a table or card layout.
- **Filter**: A control that restricts the visible expenses to those matching a selected category.
- **Search**: A text-based lookup that narrows the visible expenses to those whose description contains the search term.
- **Total Amount**: The sum of the `amount` field across all expenses currently in scope (applying any active filter or search).
- **Persistent Storage**: The browser's `localStorage` API used to retain expense data between sessions.
- **Tracker**: The Student Expense Tracker application as a whole.
- **UI**: The user interface presented by the Tracker in a web browser.

---

## Requirements

### Requirement 1: Add a New Expense

**User Story:** As a college student, I want to add a new expense with an amount, category, description, and date, so that I can record my spending as it happens.

#### Acceptance Criteria

1. THE Tracker SHALL provide an expense entry form containing the following fields: amount (numeric, required), category (selection from predefined list, required), description (text, optional, maximum 250 characters), and date (date picker, required).
2. WHEN the student submits the expense entry form with all required fields populated and a positive amount between 0.01 and 999,999.99, THE Tracker SHALL save the new Expense to Persistent Storage and display it in the Expense List within 2 seconds.
3. IF the student submits the expense entry form with one or more required fields empty, THEN THE Tracker SHALL display a validation error message identifying each missing field and SHALL NOT save the Expense.
4. IF the student enters an amount that is not a number between 0.01 and 999,999.99, THEN THE Tracker SHALL display a validation error message for the amount field and SHALL NOT save the Expense.
5. IF the student enters a date more than 365 days in the future, THEN THE Tracker SHALL display a validation error message for the date field and SHALL NOT save the Expense.
6. IF the student enters a description exceeding 250 characters, THEN THE Tracker SHALL display a validation error message for the description field and SHALL NOT save the Expense.
7. WHEN a new Expense is saved, THE Tracker SHALL clear the expense entry form fields to their default empty state and pre-populate the date field with the current date, ready for the next entry.

---

### Requirement 2: View All Expenses

**User Story:** As a college student, I want to view all my expenses in a clean list or table, so that I can review my spending history at a glance.

#### Acceptance Criteria

1. THE Tracker SHALL display all saved expenses in the Expense List, showing for each Expense: the amount formatted as a currency value with exactly 2 decimal places and the local currency symbol, the category, the description, and the date formatted as DD/MM/YYYY.
2. THE Tracker SHALL display expenses in the Expense List ordered by date descending, with the most recent expense appearing first; expenses sharing the same date SHALL be ordered by the time they were recorded, most recently recorded appearing first.
3. WHEN no expenses have been saved, THE Tracker SHALL display an empty-state message in the Expense List informing the student that no expenses have been recorded yet.
4. THE Expense List SHALL render all columns and text without truncation or horizontal scrolling on viewport widths from 320 px to 2560 px.

---

### Requirement 3: Edit an Existing Expense

**User Story:** As a college student, I want to edit an existing expense, so that I can correct mistakes or update details after the fact.

#### Acceptance Criteria

1. THE Tracker SHALL provide an edit action for each Expense displayed in the Expense List.
2. WHEN the student activates the edit action for an Expense, THE Tracker SHALL populate the expense entry form with the existing values of that Expense, including its date, amount, category, and description.
3. WHEN the student submits the expense entry form with valid data while editing an existing Expense, THE Tracker SHALL update that Expense in Persistent Storage and reflect the changes in the Expense List within 1 second.
4. IF the student submits the expense entry form while editing and one or more required fields are empty, THEN THE Tracker SHALL display a validation error message identifying each empty required field and SHALL NOT save the changes.
5. IF the student submits the expense entry form while editing and the amount is not a positive number between 0.01 and 999,999.99, THEN THE Tracker SHALL display a validation error message indicating the amount is invalid and SHALL NOT save the changes.
6. WHEN the student cancels an edit, THE Tracker SHALL discard all unsaved changes and restore the expense entry form to its default empty state.

---

### Requirement 4: Delete an Expense

**User Story:** As a college student, I want to delete an expense, so that I can remove entries that were added by mistake.

#### Acceptance Criteria

1. THE Tracker SHALL provide a delete action for each Expense displayed in the Expense List.
2. WHEN the student activates the delete action for an Expense, THE Tracker SHALL display a confirmation prompt identifying the Expense by its description and amount, asking the student to confirm or cancel the deletion.
3. WHEN the student confirms the deletion, THE Tracker SHALL permanently remove the Expense from Persistent Storage and remove it from the Expense List within 2 seconds.
4. WHEN the student cancels the deletion, THE Tracker SHALL retain the Expense in Persistent Storage and keep it visible in the Expense List.
5. IF Persistent Storage is unavailable when the student confirms the deletion, THEN THE Tracker SHALL display an error message indicating the deletion could not be completed and retain the Expense in the Expense List.

---

### Requirement 5: Filter Expenses by Category

**User Story:** As a college student, I want to filter my expenses by category, so that I can understand how much I am spending in each area.

#### Acceptance Criteria

1. THE Tracker SHALL provide a category filter control containing an option for each predefined Category plus an "All" option, with "All" selected by default.
2. WHEN the student selects a specific Category from the filter control, THE Tracker SHALL display in the Expense List only the Expenses whose category exactly matches the selected Category.
3. WHEN the student selects the "All" option from the filter control, THE Tracker SHALL display all Expenses in the Expense List regardless of category.
4. WHEN a category filter is active, THE Tracker SHALL update the Total Amount to reflect the sum of only the Expenses visible in the filtered Expense List.
5. WHEN the student selects a category filter and a search term is also active, THE Tracker SHALL apply both constraints simultaneously, displaying only Expenses that match both the selected Category and the search term.
6. IF the selected Category contains no matching Expenses, THEN THE Tracker SHALL display an empty Expense List and a Total Amount of 0.00.

---

### Requirement 6: Search Expenses by Description

**User Story:** As a college student, I want to search my expenses by description, so that I can quickly locate a specific expense without scrolling through the entire list.

#### Acceptance Criteria

1. THE Tracker SHALL provide a search input field that accepts free text of up to 200 characters.
2. WHEN the student types into the search input field, THE Tracker SHALL filter the Expense List within 300 milliseconds to display only Expenses whose description contains the entered text, evaluated case-insensitively.
3. WHEN the search input field is empty, THE Tracker SHALL display all Expenses in the Expense List (subject to any active category filter).
4. WHEN a search term is active, THE Total Amount displayed by the Tracker SHALL reflect only the Expenses visible under that search.
5. WHEN the student clears the search input field, THE Tracker SHALL restore the Expense List to its unfiltered state (subject to any active category filter).
6. WHEN the filtered Expense List contains no Expenses matching the entered search term, THE Tracker SHALL display a message indicating no results were found for the current search term.

---

### Requirement 7: Calculate and Display Total Amount Spent

**User Story:** As a college student, I want to see the total amount I have spent, so that I can keep track of my overall expenditure at a glance.

#### Acceptance Criteria

1. THE Tracker SHALL display the Total Amount in a summary area labelled "Total Amount Spent" that is visible on both the Dashboard and the Expense List view.
2. WHEN the set of visible expenses changes due to an add, edit, delete, filter, or search action, THE Tracker SHALL recalculate and update the Total Amount within 500 milliseconds to equal the arithmetic sum of the amount fields of all currently visible Expenses.
3. WHEN no expenses are visible (empty list, or filters that match no expenses), THE Tracker SHALL display a Total Amount of 0.00.
4. IF the application is configured to use Indian Rupee, THEN THE Tracker SHALL display the Total Amount formatted to two decimal places and prefixed with the currency symbol "₹" in the summary area.
5. IF the application is configured to use US Dollar, THEN THE Tracker SHALL display the Total Amount formatted to two decimal places and prefixed with the currency symbol "$" in the summary area.

---

### Requirement 8: Dashboard View

**User Story:** As a college student, I want a simple dashboard showing my total expenses and recent activity, so that I get a quick overview of my financial situation when I open the app.

#### Acceptance Criteria

1. THE Tracker SHALL display a Dashboard as the default view when the application is opened.
2. THE Dashboard SHALL display the Total Amount as the sum of the amounts of all saved Expenses, rounded to two decimal places.
3. THE Dashboard SHALL display the five most recently added or edited Expenses, ordered by last-modified timestamp with the most recent first; where two Expenses share the same last-modified timestamp, the one with the higher internal identifier SHALL appear first.
4. WHEN fewer than five Expenses exist, THE Dashboard SHALL display all available Expenses in the recent expenses section.
5. WHEN no Expenses have been saved, THE Dashboard SHALL display a zero Total Amount and an empty-state message in the recent expenses section.
6. THE Dashboard SHALL provide a navigational link or button that takes the student directly to the full Expense List view.
7. WHEN an Expense is added or edited, THE Dashboard SHALL recalculate and display the updated Total Amount and updated recent expenses list without requiring the student to navigate away from and back to the Dashboard.

---

### Requirement 9: User Interface Quality

**User Story:** As a college student, I want a clean, simple, and professional user interface, so that the application is easy and pleasant to use.

#### Acceptance Criteria

1. THE UI SHALL use a consistent colour palette, typography, and spacing throughout all views, with no per-view overrides to font family or primary colour tokens.
2. WHEN the student completes an add, edit, or delete action, THE Tracker SHALL display a visible state change or notification within 300 ms that persists for at least 1500 ms.
3. THE UI SHALL display all interactive controls (buttons, inputs, links) at a touch-target size of at least 44 × 44 CSS pixels.
4. THE UI SHALL meet WCAG 2.1 Level AA colour contrast requirements for all text elements.
5. THE UI SHALL use semantic HTML elements and ARIA labels to support screen-reader accessibility.
6. THE Tracker SHALL render without a horizontal scrollbar, overlapping elements, or clipped content on viewport widths of 375 px (mobile), 768 px (tablet), and 1280 px (desktop).

---

### Requirement 10: Persistent Storage

**User Story:** As a college student, I want my expense data to be saved automatically so that my records are still available the next time I open the application.

#### Acceptance Criteria

1. THE Tracker SHALL write all Expense data to Persistent Storage (browser localStorage) within 300 ms after every add, edit, or delete operation.
2. WHEN the application is loaded or reloaded in the browser, THE Tracker SHALL read all Expense data from Persistent Storage and populate the Expense List and Dashboard before presenting any view to the student.
3. IF Persistent Storage is unavailable, or reading from or writing to Persistent Storage fails, THEN THE Tracker SHALL display an informational message notifying the student that data cannot be saved in the current browser environment.
4. THE Tracker SHALL store Expense data in Persistent Storage as a JSON-serialised array of Expense objects.
5. FOR ALL valid arrays of Expense objects, serialising to JSON and then deserialising the resulting JSON string SHALL produce an array where each object has the same id, amount, category, description, and date field values as the corresponding object in the original array.
