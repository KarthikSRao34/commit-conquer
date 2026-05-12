# Commit Conquer

A full-stack, TypeScript-based monorepo using npm workspaces. **Commit Conquer** features a modular Express backend, a primary storefront frontend application, shared e-commerce modules, and an automated evaluation pipeline.

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started & Local Development](#getting-started--local-development)
- [Testing](#testing)
- [Automated Pipeline (CI/CD)](#automated-pipeline-cicd)
- [Contributing](#contributing)

---

## Overview

**Commit Conquer** leverages npm workspaces to organize its codebase efficiently:
- **`apps/storefront/`**: This is the primary frontend website for the project. It is built with Vite and React.
- **`packages/server/`**: Contains the Express API backend.
- **`packages/modules/` & `packages/core/`**: Houses the shared business logic across the monorepo (e-commerce domains like cart, orders, products, auth, etc.).
- **`tests/` & `eval/`**: Houses the automated testing and CI evaluation scripts.

---

## Project Structure

```text
commit-conquer/
├── apps/
│   ├── storefront/     # Main user-facing application (Vite + React)
│   └── admin/          # Admin dashboard configuration
├── packages/
│   ├── core/           # Core shared utilities, event bus, and types
│   ├── modules/        # Modular business logic (auth, cart, orders, products, etc.)
│   └── server/         # Express API backend server
├── tests/              # Jest unit & integration test suites
├── eval/               # Scripts for automated PR evaluation (k6, lighthouse)
├── .github/            # GitHub Actions CI/CD workflows
├── infra/              # Infrastructure configuration
├── package.json        # Root workspace config & shared dependencies
└── tsconfig.json       # Shared TypeScript configuration
```

---

## Tech Stack

| Layer          | Technology                                        |
|----------------|---------------------------------------------------|
| **Language**   | TypeScript                                        |
| **Runtime**    | Node.js                                           |
| **Backend**    | Express v5, Helmet, Morgan, CORS                  |
| **Frontend**   | Vite, React, React Router, TanStack Query         |
| **Monorepo**   | npm workspaces, concurrently                      |
| **Testing**    | Jest, Supertest, ts-jest                          |
| **CI/CD**      | GitHub Actions, k6 (Load Testing), Lighthouse CI  |

---

## Prerequisites

- **Node.js** v20 or later
- **npm** v8 or later

---

## Getting Started & Local Development

Starting the project is streamlined into a single command that boots both the frontend and backend simultaneously.

### 1. Clone & Install Dependencies

Clone the repository and run `npm install` at the root. This will install and link dependencies for all workspaces (`apps/`, `packages/`, `tests/`).

```bash
git clone https://github.com/Commit-Conquer/commit-conquer.git
cd commit-conquer
npm install
```

### 2. Start the Application

The primary website is located in `apps/storefront`. It comes with a unified `start` script that runs both the Vite frontend server and the Express backend server concurrently!

```bash
cd apps/storefront
npm start
```
*(This command runs `concurrently` to execute the Vite dev server for the frontend and `nodemon` for the Express backend at the same time).*

If you only want to start the backend standalone, you can do so from the root:
```bash
npm run start:server
```

---

## Testing

Tests are housed in a completely separate workspace (`tests/`) to isolate test dependencies from production code.

To run the full suite of unit and integration tests:
```bash
npm test --prefix tests
```
*Note: The integration tests spin up an in-memory instance of the Express server to test routes end-to-end without needing a running server process.*

---

## Automated Pipeline (CI/CD)

We enforce strict quality control using GitHub Actions. When you raise a Pull Request, the `.github/workflows/evaluate.yml` pipeline will trigger automatically. 

The pipeline acts as an automated judge that scores your code by:
1. **Running Tests:** Executes the Jest suite (`tests/`) to ensure no regressions.
2. **Performance Audits:** Runs a **Lighthouse** audit against the `storefront` to check page speed and accessibility.
3. **Load Testing:** Runs **k6** against the backend to ensure it handles high traffic.
4. **Bundle Check:** Checks the frontend bundle sizes.

Once finished, a bot will automatically post a comment on your PR with your detailed evaluation score.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a Pull Request and wait for the evaluation bot to score your code.

---

## License

This project does not currently specify a license. Please contact the maintainers for usage permissions.
