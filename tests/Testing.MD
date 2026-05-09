# Testing Guide — Commit Conquer

Comprehensive test suite covering unit, integration, and edge-case scenarios
for the entire Express server stack.

---

## Stack

| Tool | Purpose |
|---|---|
| [Jest](https://jestjs.io/) | Test runner & assertions |
| [ts-jest](https://kulshekhar.github.io/ts-jest/) | TypeScript support for Jest |
| [supertest](https://github.com/ladjs/supertest) | HTTP integration testing |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

No `.env` file is needed for tests. The `tests/setup.ts` file automatically
sets all required environment variables:

```
NODE_ENV=test
PORT=3099
CORS_ORIGIN=http://localhost:3000
```

---

## Folder Structure

Place files exactly as shown below relative to your repo root:

```
repo-root/
├── jest.config.js                          ← test runner config
├── package.json                            ← updated with test scripts & deps
│
├── packages/
│   └── server/
│       └── src/
│           ├── app.ts                      ← Express app factory (createApp)
│           ├── types/index.ts              ← Commit, User, LeaderboardEntry types
│           ├── routes/
│           │   ├── index.ts
│           │   ├── commits.ts
│           │   ├── users.ts
│           │   └── leaderboard.ts
│           ├── middleware/
│           │   ├── errorHandler.ts         ← AppError class + errorHandler
│           │   ├── notFoundHandler.ts
│           │   ├── validateBody.ts
│           │   └── authenticate.ts
│           ├── controllers/
│           │   ├── commitController.ts
│           │   ├── userController.ts
│           │   └── leaderboardController.ts
│           ├── services/
│           │   ├── commitService.ts        ← must expose _reset() for tests
│           │   ├── userService.ts          ← must expose _reset() for tests
│           │   └── leaderboardService.ts
│           └── utils/
│               ├── crypto.ts
│               ├── pagination.ts
│               └── validators.ts
│
└── tests/
    ├── setup.ts
    ├── global-setup.ts
    ├── global-teardown.ts
    ├── fixtures/
    │   ├── commits.ts
    │   └── users.ts
    ├── helpers/
    │   ├── testServer.ts
    │   └── mockFactory.ts
    ├── unit/
    │   └── server/
    │       ├── utils/
    │       │   ├── crypto.test.ts
    │       │   ├── pagination.test.ts
    │       │   └── validators.test.ts
    │       ├── middleware/
    │       │   ├── errorHandler.test.ts
    │       │   ├── validateBody.test.ts
    │       │   └── authenticate.test.ts
    │       ├── services/
    │       │   ├── commitService.test.ts
    │       │   ├── userService.test.ts
    │       │   └── leaderboardService.test.ts
    │       └── controllers/
    │           ├── commitController.test.ts
    │           └── userController.test.ts
    └── integration/
        └── api.test.ts
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage report
npm run test:coverage

# Watch mode (re-runs on file save)
npm run test:watch
```

---

## Coverage Summary

| Area | Files Tested | Approx. Coverage |
|---|---|---|
| Utils | crypto, pagination, validators | ~95% |
| Middleware | errorHandler, validateBody, authenticate | ~90% |
| Services | commitService, userService, leaderboardService | ~85% |
| Controllers | commitController, userController | ~85% |
| Integration (HTTP) | all API routes end-to-end | ~80% |

---

## Key Design Decisions

### `_reset()` on services
Each service exposes a `_reset(data?)` method used only in tests to seed
the in-memory store to a known state before each test. This keeps tests
deterministic without touching real databases.

### Controllers accept injected services
All controllers accept an optional service argument in their constructor:

```ts
const controller = new CommitController(mockService);
```

This allows unit tests to pass a fully mocked service and test only
controller logic in isolation.

### Integration tests use the real stack
`tests/integration/api.test.ts` makes actual HTTP requests through the full
middleware → route → controller → service chain using supertest. No mocks.

### AUTH_TOKEN constant
The `authenticate` middleware treats any token that is not the string
`"invalid"` as valid (simplified for development). Integration tests use
`Bearer valid-test-token` from `tests/helpers/testServer.ts`.

---

## Troubleshooting

**`Cannot find module '../../packages/server/src/...'`**
→ Check your `tsconfig.json` includes both `packages/**/*` and `tests/**/*`
in the `include` array.

**`jest: command not found`**
→ Run `npm install` first. Jest is a devDependency.

**Tests pass individually but fail together**
→ The in-memory store is shared across test files. Make sure every test file
calls `service._reset()` inside `beforeEach`.

**`supertest` connection errors**
→ Ensure `createApp()` is imported from `packages/server/src/app.ts` and
does NOT call `app.listen()` — that belongs only in `packages/server/index.ts`.

---

## Suggested Future Improvements

1. **Frontend tests** — add Vitest + React Testing Library for `apps/web`
2. **GitHub API mocking** — if real GitHub commits are fetched, mock with `msw`
3. **JWT tests** — once real JWT is implemented, add token expiry & signature tests
4. **Database layer** — replace in-memory stores with a real DB and add repository tests
5. **CI pipeline** — add `.github/workflows/test.yml` to run tests on every PR
6. **Snapshot tests** — add response shape snapshots for API stability
7. **Load tests** — use `autocannon` or `k6` to test throughput under load