# Square integration (Front Desk App)

This describes how the **shipped** desktop app (`src/server` + `apps/web`) uses Square. It replaces older notes about catalog-order membership and in-app waiver workflows, which are **not** part of the current front desk product.

## What the app uses Square for

- **Customer search** — by name, email, phone, lot, address (see `src/server/services/squareService.js` and `POST /api/customers/search`).
- **Membership** — configured **Square customer segments** in Admin; membership cache is refreshed from Square and stored locally (`membership_cache` in SQLite).
- **Orders / passes** — where implemented (e.g. day pass or order validation flows), via Square Orders/Catalog APIs as wired in the server.

## What the app does locally

- **Check-in log** — SQLite table `checkin_log` (member and day-pass rows) via `POST /api/customers/check-in` and `POST /api/customers/check-in/daypass`.
- **Offline queue** — pending rows in `checkin_queue` when Square sync is deferred (see `src/server/services/offlineQueue.js`).

## Waivers

The **front desk UI does not** collect waivers, show waiver QR flows, or block check-in on waiver status. Any facility waiver process is **outside** this app.

Optional **Square custom attributes** (e.g. a `waiver-signed` attribute) may still exist in some Square sandboxes for legacy experiments; they are **not** required for the current check-in flow.

## Environments

Use **sandbox** or **production** credentials per your Square app. Set `SQUARE_ACCESS_TOKEN` and related URL/version variables as documented in [INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md) and [QUICK_START.md](../QUICK_START.md).

For deep API references, see [Square’s API docs](https://developer.squareup.com/reference/square).
