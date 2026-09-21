# 🎓 Student Expense Tracker

A modern, fast, and accessible single-page web application (SPA) built with vanilla HTML5, CSS3, and JavaScript (ES Modules) designed to help students track and manage their daily expenses effortlessly.

---

## ✨ Features

- **📊 Dashboard Overview**: Displays total spending summary and recent transactions at a glance.
- **➕ Add & Edit Expenses**: Track spending with amount, category, date, and optional description.
- **🔍 Filter & Search**: Instantly search expenses by description or filter by category (*Food*, *Transport*, *Books*, *Entertainment*, *Health*, *Other*).
- **💾 Local Storage Persistence**: Saves all transactions locally in your browser so your data persists across sessions.
- **📱 Responsive & Accessible Design**: Optimized for desktop and mobile screens with full keyboard navigation and ARIA accessibility features.
- **🗑️ Delete Confirmation**: Built-in modal confirmation dialog to prevent accidental deletions.
- **🧪 Comprehensive Testing**: Includes unit tests, property-based testing, and end-to-end (E2E) testing.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES Modules)
- **State & Storage**: Custom state management & `localStorage`
- **Unit & Property Testing**: [Jest](https://jestjs.io/), `@jest/globals`, [fast-check](https://github.com/dubzzz/fast-check)
- **E2E & Accessibility Testing**: [Playwright](https://playwright.dev/)

---

## 📁 Project Structure

```text
Student Expense Tracker/
├── css/
│   └── styles.css          # Core styles, variables, and responsive layout
├── js/
│   ├── app.js              # Application entry point & initialization
│   ├── events.js           # Event listeners & UI handlers
│   ├── model.js            # Expense data model & validations
│   ├── render.js           # UI rendering functions
│   ├── state.js            # Reactive application state manager
│   └── storage.js          # LocalStorage abstraction layer
├── tests/
│   ├── e2e/                # Playwright end-to-end & accessibility tests
│   └── unit/               # Jest unit & property-based tests
├── index.html              # Main single-page interface
├── jest.config.js          # Jest configuration
├── package.json            # Scripts & dependencies
└── playwright.config.js    # Playwright configuration
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- `npm` (comes with Node.js)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aidlc-academy/Student-Expense-Tracker.git
   cd Student-Expense-Tracker
   ```

2. **Install dev dependencies:**
   ```bash
   npm install
   ```

---

## 🏃 Running the Application

Since this is a vanilla ES Module web app, run a local web server (such as `serve` or VS Code Live Server):

```bash
npx serve .
```

Then open `http://localhost:3000` in your web browser.

---

## 🧪 Running Tests

### Run All Tests
```bash
npm test
```

### Run Unit Tests (Jest & fast-check)
```bash
npm run test:unit
```

### Run End-to-End Tests (Playwright)
```bash
npm run test:e2e
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
