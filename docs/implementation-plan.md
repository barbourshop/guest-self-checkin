<!-- actionable build steps -->
# Implementation Plan – Guest Self Check-In v2

## Phase 1 – Foundations
1. **Repo Restructure**
   - Create `apps/web` (SvelteKit) and `services/api` (Lambda handlers).
   - Setup root `pnpm`/`npm` workspace for shared packages (`packages/domain-square`, `packages/config`).
2. **Infrastructure Skeleton**
   - Initialize AWS CDK project under `infra/`.
   - Define baseline stacks: networking (if needed), API/Lambda, DynamoDB tables (`passes`, `checkins`, `config`), S3 buckets (static site + audit), Cognito User Pool.
   - Add LocalStack/SAM configs matching `docs/local-testing.md`.

## Phase 2 – Core Services
1. **Shared Square Module**
   - Port logic from `src/server/services/squareService.js` into `packages/domain-square`.
   - Add sandbox/prod config injection via environment + Secrets Manager.
2. **Lambda Handlers**
   - `customers-search`: wraps Square search, caches membership metadata.
   - `passes-validate`: handles scan validations, redemption logging.
   - `passes-mine`: returns member/day-pass codes (if using Square order IDs, map via DynamoDB).
   - `square-webhook`: processes catalog/order events and updates pass/membership tables.
3. **Persistence**
   - Implement DynamoDB access layer (using AWS SDK v3) for passes, checkins, waiver hints.
   - Add TTL where needed (e.g., day-pass valid windows).

## Phase 3 – Frontend (SvelteKit)
1. **Routing & Auth**
   - Implement layout with Cognito Hosted UI integration (login, callback).
   - Stores for session, waiver acknowledgements, device ID.
2. **Experiences**
   - **Search/Check-In** route calling `/customers/search`, `/checkins`.
   - **Passes** route showing QR/short codes for members/day-pass buyers.
   - **Purchase CTA** linking to Square checkout page.
   - **Admin Dashboard** for metrics + code management (role-gated).
3. **Kiosk Mode**
   - `/kiosk` route auto-authenticates via device credential, listens to scanner input, shows large confirmation UI, handles offline queue.

## Phase 4 – Scanner & Square Item Config
1. **Config Management**
   - Store allowed Square catalog item IDs + metadata in AppConfig/Parameter Store.
   - Admin UI + API endpoint to update config (with audit logging).
2. **Item-Based Validation**
   - Scanner handler fetches order details, verifies item matches config, checks redemption status, logs visit, and for day passes marks order as used (DynamoDB flag or Square custom attribute).
   - Support revocation by toggling status in DynamoDB.

## Phase 5 – Testing & Delivery
1. **Automated Tests**
   - Unit tests for domain modules and Lambdas.
   - Playwright scenarios covering member lookup, pass display, kiosk scan.
   - Integration suite that replays Square sandbox webhooks locally.
2. **Documentation & Runbooks**
   - Update `README` with new workspace instructions.
   - Ensure `docs/local-testing.md` reflects actual scripts/commands.
3. **Deployment**
   - GitHub Actions pipeline running lint/tests + CDK deploy (dev/stage/prod).
   - CloudFront invalidation + versioned static assets.

This plan ties into existing reference docs (`v1-analysis`, `v2-architecture`, `frontend-mvp-plan`, `code-pass-flow`, `api-contracts`, `local-testing`) and provides a clear sequence for implementation.

