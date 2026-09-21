/**
 * model.js — Expense factory and validation logic
 */

export const CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Other"];

/**
 * Create a new Expense object from raw form fields.
 * Generates a UUID v4 id and sets createdAt / lastModified to Date.now().
 * Amount is rounded to 2 decimal places.
 *
 * @param {{ amount: string|number, category: string, description: string, date: string }} fields
 * @returns {import('./types').Expense}
 */
export function createExpense(fields) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    amount: Math.round(Number(fields.amount) * 100) / 100,
    category: fields.category,
    description: (fields.description ?? "").trim(),
    date: fields.date,
    createdAt: now,
    lastModified: now,
  };
}

/**
 * Return a new Expense with updated fields, preserving the original id and createdAt.
 * lastModified is set to Date.now(). Amount is rounded to 2 decimal places.
 *
 * @param {import('./types').Expense} existing
 * @param {{ amount: string|number, category: string, description: string, date: string }} fields
 * @returns {import('./types').Expense}
 */
export function updateExpense(existing, fields) {
  return {
    id: existing.id,
    createdAt: existing.createdAt,
    amount: Math.round(Number(fields.amount) * 100) / 100,
    category: fields.category,
    description: (fields.description ?? "").trim(),
    date: fields.date,
    lastModified: Date.now(),
  };
}

/**
 * Validate raw expense form inputs.
 * Pure function — no side-effects, no DOM access.
 *
 * Rules:
 *  - amount: required; must be a number in [0.01, 999999.99]
 *  - category: required; must be one of CATEGORIES
 *  - date: required; must not be more than 365 days in the future
 *  - description: optional; trimmed length must be ≤ 250 characters
 *
 * @param {{ amount: any, category: any, description: any, date: any }} fields
 * @returns {{ valid: boolean, errors: { amount?: string, category?: string, description?: string, date?: string } }}
 */
export function validateExpenseFields(fields) {
  const errors = {};

  // --- amount ---
  const rawAmount = fields.amount;
  if (rawAmount === "" || rawAmount === null || rawAmount === undefined) {
    errors.amount = "Amount is required.";
  } else {
    const num = Number(rawAmount);
    if (isNaN(num) || num < 0.01 || num > 999999.99) {
      errors.amount = "Amount must be a number between 0.01 and 999,999.99.";
    }
  }

  // --- category ---
  const rawCategory = fields.category;
  if (!rawCategory || String(rawCategory).trim() === "") {
    errors.category = "Category is required.";
  } else if (!CATEGORIES.includes(rawCategory)) {
    errors.category = `Category must be one of: ${CATEGORIES.join(", ")}.`;
  }

  // --- date ---
  const rawDate = fields.date;
  if (!rawDate || String(rawDate).trim() === "") {
    errors.date = "Date is required.";
  } else {
    const inputDate = new Date(rawDate);
    if (isNaN(inputDate.getTime())) {
      errors.date = "Date is invalid.";
    } else {
      // Compare at day granularity using UTC to avoid timezone drift
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      const maxDate = new Date(todayUTC);
      maxDate.setUTCDate(maxDate.getUTCDate() + 365);

      // Normalise input to midnight UTC for a fair day-level comparison
      const inputUTC = new Date(rawDate);
      inputUTC.setUTCHours(0, 0, 0, 0);

      if (inputUTC > maxDate) {
        errors.date = "Date must not be more than 365 days in the future.";
      }
    }
  }

  // --- description (optional, max 250 chars after trimming) ---
  const rawDescription = fields.description ?? "";
  const trimmedDescription = String(rawDescription).trim();
  if (trimmedDescription.length > 250) {
    errors.description = "Description must not exceed 250 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
