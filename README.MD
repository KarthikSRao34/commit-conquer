# Commit Conquer

A TypeScript-based monorepo project with a modular architecture, featuring an Express backend and frontend app(s) managed via npm workspaces.

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Development](#development)
- [Contributing](#contributing)

---

## Overview

**Commit Conquer** is a monorepo structured with npm workspaces, separating concerns into `apps/` (frontend/client applications) and `packages/` (shared libraries and backend server). The server is powered by Express and written in TypeScript, with infrastructure configuration housed in `infra/`.

---

## Project Structure

```
commit-conquer/
├── apps/               # Frontend applications (e.g., Vite-based)
├── packages/           # Shared packages and backend server
│   └── server/         # Express API server (index.ts)
├── infra/              # Infrastructure configuration
├── .vite/              # Vite dependency cache
├── package.json        # Root workspace config & shared dependencies
├── tsconfig.json       # Shared TypeScript configuration
└── .gitignore
```

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Language     | TypeScript (ES2020 target)          |
| Runtime      | Node.js                             |
| Backend      | Express v5, Helmet, Morgan, CORS    |
| Frontend     | Vite (via `apps/`)                  |
| Execution    | ts-node, nodemon                    |
| Package Mgr  | npm workspaces                      |

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v8 or later

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Commit-Conquer/commit-conquer.git
cd commit-conquer
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for all workspaces (`apps/*` and `packages/*`) from the root.

---

## Scripts

Run these from the **root** of the project:

| Script | Command | Description |
|---|---|---|
| Start server | `npm run start:server` | Runs the Express server via ts-node |
| Dev apps | See individual app directories | Each app has its own dev script |

To start the backend server:

```bash
npm run start:server
```

To run a frontend app, navigate into the relevant directory under `apps/` and use its own `dev` script:

```bash
cd apps/<app-name>
npm run dev
```

---

## Development

### Backend (Express Server)

The server entry point is located at `packages/server/index.ts`. It uses:

- **Express v5** for routing
- **Helmet** for security headers
- **Morgan** for HTTP request logging
- **CORS** for cross-origin resource sharing
- **dotenv** for environment variable management

### TypeScript Configuration

The root `tsconfig.json` targets ES2020 with `NodeNext` module resolution and is shared across the monorepo. Individual workspaces may extend it as needed.

### Environment Variables

Create a `.env` file in the root (or in the relevant package directory) and configure your environment-specific values. Use `dotenv` to load them — refer to `packages/server/index.ts` for which variables are expected.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project does not currently specify a license. Please contact the maintainers for usage permissions.