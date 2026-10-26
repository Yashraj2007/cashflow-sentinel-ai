# CashFlow Sentinel AI

> Predict cash gaps. Understand the risk. Make smarter business decisions.

CashFlow Sentinel AI is a frontend prototype for a financial decision-support dashboard designed for small and medium-sized businesses (SMBs/MSMEs), manufacturers, wholesalers, and distributors. It presents cash-flow risk, receivables, payables, customer and supplier information, and what-if scenario concepts in one interface.

**Project status:** Frontend demo / hackathon prototype. The current version uses sample data and demo interactions. It is not connected to a production backend or a trained AI forecasting model.

## Table of Contents

- [Overview](#overview)
- [Current Features](#current-features)
- [Technology Stack](#technology-stack)
- [Requirements](#requirements)
- [Run the Project Locally](#run-the-project-locally)
- [Available Commands](#available-commands)
- [Project Structure](#project-structure)
- [How to Use the Demo](#how-to-use-the-demo)
- [Current Limitations](#current-limitations)
- [Troubleshooting](#troubleshooting)
- [Future Development Roadmap](#future-development-roadmap)
- [Contributing](#contributing)

## Overview

Businesses can experience cash shortages even when they have sales or unpaid customer invoices. CashFlow Sentinel AI is designed to help business owners review expected incoming payments and planned expenses, understand possible cash-flow risks, and explore actions before making decisions.

The interface uses an example business named **Arora Manufacturing** and illustrative records. Names, dates, balances, and risk indicators in the demo are synthetic and should not be treated as real financial advice or actual business records.

## Current Features

The application includes a responsive dashboard layout with sidebar navigation and a top navigation bar. The available views are described below.

| View | What the current prototype displays |
|---|---|
| **Overview** | Example cash metrics, a projected cash-balance chart, a cash-shortage warning, recommended actions, receivables to watch, and upcoming payments. |
| **Cash Forecast** | A cash-flow forecasting workspace with illustrative metrics and forecast-related information. |
| **Sales Invoices** | Sample customer invoices with a search field and demo import/export/action controls. |
| **Purchase Invoices** | Sample supplier bills and payment-related information. |
| **Transactions** | Example customer receipts, supplier payments, and operating expenses. |
| **Customers** | Sample receivables, payment-delay indicators, on-time rates, and customer risk labels. |
| **Suppliers** | Sample payables, delivery-delay indicators, on-time rates, and supplier risk labels. |
| **Deal Impact Checker** | A form concept for entering an order's customer, quantity, costs, and payment dates. |
| **Scenario Lab** | A form concept and sample recommendations for exploring payment delays, unexpected costs, and other cash-flow changes. |
| **Alerts & Reminders** | Example cash-shortage, invoice, supplier-delay, and upcoming-payment alerts, plus a demo reminder form. |
| **Reports** | Sample report entries for cash flow, receivables ageing, and supplier reliability. |
| **Settings** | A demo settings form and sample-data reset control. |

### UI and usability

- Light fintech dashboard styling with navy and teal accents.
- Responsive sidebar, mobile navigation controls, metric cards, tables, forms, and charts.
- Search on the dashboard and within record tables where implemented.
- Status labels and iconography using Lucide React.
- Indian Rupee (INR) examples using the `₹` symbol.

## Technology Stack

This version is configured as a **React + Vite + JavaScript + plain CSS** project.

| Technology | Purpose |
|---|---|
| React 19 | UI components and client-side state. |
| JavaScript and JSX | Application logic and component markup. |
| Vite 8 | Local development server and production bundling. |
| Plain CSS | Application styles in `src/styles.css`. |
| Lucide React | Interface icons. |

### Explicitly not used

- Next.js
- TypeScript / TSX
- Tailwind CSS
- A production backend or database
- A connected LLM or trained machine-learning model

## Requirements

- Node.js **20.19+** or **22.12+** (a supported recent LTS release is recommended).
- npm, installed with Node.js.
- Internet access for the first dependency installation.
- Antigravity, VS Code, or another editor/terminal (Antigravity is optional).

Verify Node.js and npm from a terminal:

```bash
node -v
npm -v
```

If either command is not recognised, install Node.js from the [official Node.js website](https://nodejs.org/en/download) and reopen your terminal.

## Run the Project Locally

### 1. Extract and open the project

1. Extract the project ZIP file.
2. Open the extracted `cash-flow-sentinel-ai` folder in Antigravity (or your preferred editor).
3. Open the integrated terminal.
4. Check that the current directory contains `package.json`.

On Windows PowerShell, you can verify this with:

```powershell
Test-Path .\package.json
```

The command should return `True`. If it returns `False`, use `cd` to enter the project root.

### 2. Install dependencies

Run this command from the project root:

```bash
npm install
```

This installs the packages declared in `package.json`. You do not need to install React, Vite, or Lucide React separately.

### 3. Start the development server

```bash
npm run dev
```

Vite prints a local URL in the terminal, usually:

```text
http://localhost:5173
```

Open the exact URL shown by your terminal. Keep the terminal running while you test the app. To stop the server, press `Ctrl+C` in that terminal.

### 4. Build and preview the production version

To check whether Vite can create a production bundle:

```bash
npm run build
```

If the build succeeds, run:

```bash
npm run preview
```

Vite prints a preview URL, usually `http://localhost:4173`. Open the URL shown in the terminal.

## Available Commands

| Command | Description |
|---|---|
| `npm install` | Install project dependencies. |
| `npm run dev` | Start the local Vite development server. |
| `npm run build` | Build production assets into the `dist/` directory. |
| `npm run preview` | Serve the production build locally for verification. |

## Project Structure

```text
cash-flow-sentinel-ai/
├── public/                 # Static assets and icons
├── src/
│   ├── App.jsx             # Main application view and demo data
│   ├── main.jsx            # React entry point
│   └── styles.css          # Plain CSS styles
├── .gitignore
├── index.html              # Vite HTML entry
├── package.json            # Scripts and dependencies
├── vite.config.js          # Vite configuration
├── README.md               # Project documentation
└── CHECK_REPORT.md         # Static review and known limitations
```

## How to Use the Demo

1. Start the development server using `npm run dev`.
2. Open the URL reported by Vite.
3. Use the left navigation to switch between dashboard views.
4. Use the search inputs on views where search is implemented.
5. Open the Scenario Lab and Deal Impact Checker to review the prototype forms.
6. Test the responsive layout by resizing the browser or using its device toolbar.
7. Check the browser developer console and terminal for errors while interacting with the UI.

Some controls intentionally display a demo alert rather than completing an operation. Read the next section before using the prototype for a presentation.

## Current Limitations

The current project is a UI prototype, and some behaviours are simulated. In particular:

- Dashboard numbers, transaction records, invoice lists, customer/supplier metrics, and chart values are example data, not connected to a bank or accounting platform.
- The cash chart is currently based on a fixed sample series. Changing the visible range does not yet recalculate a genuine forecast from transaction records.
- Some buttons display browser alerts to indicate demo actions. They do not create, edit, or persist real invoices, payments, or business records.
- CSV import and export controls are placeholders. A complete CSV mapping, validation, import, and downloadable export workflow is not yet implemented.
- Deal and scenario forms do not yet run a complete financial calculation engine.
- Recommendation scores and risk labels are illustrative, not produced by a validated forecasting or machine-learning model.
- Reminder controls do not send emails, SMS messages, or calls.
- There is no backend API, database, authentication system, or external AI integration in this frontend-only version.
- Data is not guaranteed to persist after reloading the page.

Do not enter sensitive personal or business financial information into this demo. Use synthetic test data until secure storage, access controls, and backend services have been implemented.

## Troubleshooting

### `node` or `npm` is not recognised

Install a supported Node.js version, close and reopen the terminal, and run `node -v` and `npm -v` again.

### `package.json` cannot be found

The terminal is not in the project root. Change directory to the folder that contains `package.json` before running npm commands.

### The development server cannot use port 5173

Vite may automatically select another available port. Open the exact URL printed in the terminal. Stop an older development server with `Ctrl+C` if you no longer need it.

### Dependency installation fails

1. Check your internet connection.
2. Confirm that your Node.js version meets the requirements.
3. Run `npm install` again from the project root.
4. If the previous installation was interrupted, remove `node_modules` and retry.

PowerShell command for the optional cleanup:

```powershell
Remove-Item -Recurse -Force .\node_modules
npm install
```

Do not delete `package.json`. If a lockfile exists, normally keep it so dependency resolution stays consistent.

### The page is blank or a component does not render

1. Check the terminal for Vite errors.
2. Open browser developer tools and inspect the Console tab.
3. Confirm the root element exists in `index.html` and `src/main.jsx` imports `src/App.jsx` and `src/styles.css`.
4. Restart the development server after correcting source errors.

## Future Development Roadmap

The following are recommended next steps; they are **not all implemented** in the current prototype.

1. **Reliable financial data model:** Define transaction, invoice, customer, supplier, and payment schemas with validation and consistent date/amount handling.
2. **Forecast calculation engine:** Calculate daily cash balances from dated inflows and outflows, avoid double counting, and show reserve breaches with traceable reasons.
3. **Functional CSV import/export:** Support column mapping, validation, duplicate detection, error reporting, and downloadable exports.
4. **Working scenario simulations:** Recalculate the baseline and alternative cash forecasts when payment dates, amounts, or expenses change.
5. **Persistent storage and backend API:** Add an API and database, then move data operations out of presentation components.
6. **Prediction validation:** If a predictive model is introduced, evaluate it on historical data and report its limits and forecast accuracy.
7. **Security and privacy:** Add authentication, authorisation, input validation, secure secret management, and appropriate protection for financial records.
8. **Automated tests:** Test financial calculations, imports, state updates, and production builds.

## Contributing

For development changes:

1. Create a separate branch for your change if using Git.
2. Keep UI components and calculation logic modular as the application grows.
3. Avoid adding TypeScript, Next.js, or Tailwind CSS unless the project's requirements deliberately change.
4. Run `npm run build` before submitting changes.
5. Update this README whenever setup commands, scripts, architecture, or actual functionality changes.

## Disclaimer

CashFlow Sentinel AI is an educational/demo prototype. Its sample data and illustrative risk indicators are not financial advice, loan approval decisions, or guarantees of future cash availability. Validate financial calculations and obtain appropriate professional advice before using any future production version to make real business decisions.
