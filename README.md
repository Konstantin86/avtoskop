# Avtoskop

Avtoskop (Автоскоп) helps private car buyers in Ukraine find a car across auto.ria, OLX and official dealers, see whether the price is fair, and get a history report for a specific car.

Status: design done, building the MVP. See [design/](design/) for the product definition, technical plan and wireframes.

## Stack

- TypeScript monorepo with pnpm workspaces
- Next.js website, Node.js background jobs
- PostgreSQL
- Claude API for report and checklist text
- Hosting: one Hetzner server with Coolify (after local development)

## Repository layout

| Folder          | Holds                                                |
| --------------- | ---------------------------------------------------- |
| `apps/web`      | Next.js site and its API routes                      |
| `apps/jobs`     | Collectors, cleaners, report job                     |
| `packages/db`   | Database schema and migrations                       |
| `packages/core` | Price label, rating, VIN checks, shared types        |
| `packages/i18n` | Ukrainian and English text files                     |
| `infra`         | Server setup notes, Coolify settings, backup scripts |
| `design`        | Product and technical design, wireframes             |

## Local development

Requirements: Node.js 24 or newer, pnpm, Docker (Colima or Docker Desktop; with Colima run `colima start` first).

```bash
cp .env.example .env
```

```bash
docker compose up -d
```

```bash
pnpm install
```

PostgreSQL then runs on `localhost:5433` (5433, so it does not clash with a local PostgreSQL on 5432).
