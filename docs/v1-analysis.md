<!-- v2 transition analysis -->
# Guest Self Check-In v1 Analysis

## Runtime Architecture
- Electron shell (`main.js`) bundles a Vite-built React UI (`dist/`) and spawns the Express API (`src/server/server.js`) on `localhost:3000`.
- Express proxies all guest membership functionality to Square via `src/server/services/squareService.js` and exposes REST endpoints under `/api`.
- Local CSV logging of check-ins is handled by `src/server/utils/checkinMetricsLogger.js`, writing to `logs/checkins/*.csv` per day, which complicates centralized analytics and retention.

## Frontend Flow (`src/`)
- `App.tsx` orchestrates search ➜ detail ➜ check-in.
- `fetchCustomerNames()` fetches the entire Square customer list on load to support local fuzzy search in Redux state, creating heavy initial payloads in production.
- Each search result triggers `checkWaiverStatus()` and `logCheckIn()` calls through `/api`, leading to sequential server roundtrips per customer.
- Waiver prompts gate the check-in button until `hasSignedWaiver` is true, but waiver signing itself ultimately only toggles a Square custom attribute via the backend.
- `VITE_USE_MOCK_API` toggles between mock data (`src/mocks`) and the Express API to support demos.

## Backend Flow (`src/server/`)
- `customerRoutes` expose `/search/{phone|email|lot}`, `/check-in`, `/names`, `/admin/...`.
- `customerService` composes `squareService` + `waiverService` to enrich Square records with membership + waiver status before returning to the UI.
- `squareService` is responsible for:
  - `searchCustomers`: POST `/customers/search` with fuzzy filters for email/phone/reference (lot) and then per-customer membership checks by fetching each record again and inspecting `segment_ids`.
  - `getCustomerNames`: paginates through `/customers` to support local search data.
  - `checkMembershipStatus` and `checkMembershipBySegment`: duplicates membership logic.
- `waiverService` stores a timestamp in the Square custom attribute `waiver-signed`; reads treat signatures older than 1 year as invalid.
- `customerController.logCheckIn` simply appends CSV rows; no persistence beyond filesystem and no deduplication or analytics.
- Error handling is centralized via `middleware/errorHandler.js`, logging through Winston-style `logger`.

## External Dependencies
- Square Customer & Orders APIs (env-configured via `config/square.js`).
- Custom customer attributes (e.g., `waiver-signed`) for waiver state.
- Local filesystem for logging, `Electron` for packaging, Playwright for E2E tests, Jest for unit tests.

## Constraints & Observations
- Desktop/Electron requirement creates installation overhead and manual updates; not viable for bring-your-own-device scenarios.
- Local CSV logs and reliance on custom Square attributes make it hard to move toward privacy-preserving mobile experiences.
- Downloading the entire customer list to the browser is infeasible for mobile networks and increases PII exposure.
- Tight coupling between frontend state management and Square schema complicates re-use; flows should be abstracted into reusable service modules for Lambda contexts.
- Existing tests (Playwright, Jest) focus on UI—they can inspire v2 scenarios but need adaptation for API-first flows.

## Takeaways for v2
- Keep Square as membership source of truth, but reduce per-search API fan-out by caching membership segment info server-side (e.g., DynamoDB TTL cache) instead of fetching per customer.
- Replace `waiver-signed` custom attribute with in-browser waiver tracking plus anonymized backend hints, per the new requirements.
- Migrate logging to AWS-native telemetry (CloudWatch Logs, DynamoDB, S3) for centralized, PII-safe reporting.
- Re-architect UI as a statically hosted mobile-first web app (React/Vite fits) authenticating via Cognito, hitting API Gateway-backed Lambdas that encapsulate the current service logic.

#endregion

