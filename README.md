# Front Desk App — Guest check-in

Desktop-oriented check-in for recreational facilities. The **shipped product** is an **Electron** app with a **SvelteKit** UI (`apps/web`) and an **Express** API (`src/server`) that talks to **Square** (customer search, segments/membership, orders where needed). Check-ins are recorded in a local **SQLite** database (`checkin.db`).

## Documentation (operators & developers)

| Doc | Audience |
|-----|----------|
| [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) | First-time install, Square token |
| [STAFF_GUIDE.md](STAFF_GUIDE.md) | Front desk daily use |
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Supervisors, cache, segments, exports |
| [QUICK_START.md](QUICK_START.md) | Local run & env summary |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Manual QA in dev |
| [TESTING.md](TESTING.md) | Jest-focused server tests |
| [docs/databases.md](docs/databases.md) | SQLite databases (desktop app) |
| [docs/square-integration.md](docs/square-integration.md) | How the desktop app uses Square |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Express API shapes used by `apps/web` |

## Features (current UI)

- Search members by name, phone, email, lot (and related flows)
- Day pass check-in (guest count)
- End of day: download **today’s** check-ins as Excel from the home screen
- Admin: membership cache, Square segments, check-in history export

Waivers are **not** part of the front desk check-in flow in this app.

## Repository layout

```
apps/web/          # SvelteKit front end (Vite dev server, proxies /api → backend)
src/server/        # Express API, SQLite, Square integration
main.js            # Electron shell (starts server + window)
infra/             # AWS CDK (optional / future cloud stack)
services/api/      # v2 Lambda-style API (separate from desktop Express routes)
docs/              # Technical reference only (Square, API contract, SQLite); images for guides
```

## Development

**Full stack (recommended):**

```bash
npm install
cd apps/web && npm install && cd ../..
npm run prod
```

Opens the UI (typically `http://localhost:5173`) with API on `http://localhost:3000`.

**Backend only:**

```bash
npm run server
```

**Front end only** (expects API reachable; Vite proxies `/api` to port 3000):

```bash
npm run dev
```

Environment highlights:

- `SQUARE_ACCESS_TOKEN` — required for live Square calls (see installation guide)
- `USE_MOCK_SQUARE_SERVICE=true` — mock Square on the **server** for tests/demos
- `DATABASE_PATH` or `ELECTRON_USER_DATA` — where SQLite lives (see `src/server/db/database.js`)

The root `VITE_USE_MOCK_API` flag applies only to the **legacy** `src/App.svelte` shell, not the main `apps/web` app.

## Testing

```bash
npm test
npm run type-check
```

`npm run test:e2e` is currently a stub in `package.json` (no Playwright suite wired to that script).

## CI

Pull requests run the workflow in [.github/workflows/full-pipeline.yml](.github/workflows/full-pipeline.yml): install, type-check, Jest with coverage, web build, and related packaging jobs when configured.

## Optional v2 cloud stack

`services/api/` and `infra/` hold a separate API Gateway + Lambda codebase. It is **not** what the Electron front desk app runs for daily check-in. See [services/api/README.md](services/api/README.md) if you develop that package.
