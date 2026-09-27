# Avtoskop

Car search and history reports for private buyers in Ukraine. Read `design/technical-plan.md` before changing architecture, data model, price label or rating logic.

## Conventions

- TypeScript strict everywhere. Validate all external data (APIs, AI output) with Zod.
- Pure business logic (price label, rating, VIN checks) lives in `packages/core`, with Vitest tests. No framework code there.
- Rating weights and price label thresholds live in one config file, not scattered in code.
- Never store seller phone numbers. Store emails only as hashes.
- The AI writes report text only from facts we pass in; every reason cites a fact id.
- Secrets go in `.env` (local) or Coolify (server), never in the repository.
- UI text goes through `packages/i18n`, Ukrainian first, then English.

## Commands

- `pnpm db:up` starts local PostgreSQL.
- `pnpm test`, `pnpm typecheck`, `pnpm format`.
