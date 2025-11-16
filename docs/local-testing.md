<!-- local test strategy -->
# Local Testing Strategy

## Goals
- Exercise the full stack (frontend, API Gateway/Lambda equivalents, DynamoDB, code scanning flows) without touching production data.
- Provide knobs to selectively hit Square sandbox vs. production (with safeguards so prod tokens are never used by accident).
- Allow reproducible integration tests that staff can run before deploying.

## Square Environment
1. **Create Sandbox Resources**
   - In the Square Developer Dashboard, enable Sandbox.
   - Duplicate catalog items for day passes and memberships; note their sandbox `catalog_object_id`s.
   - Seed sandbox customers/orders that mimic real scenarios (members, guests, revoked passes).
2. **Secrets Management**
   - Store sandbox access token + location ID in AWS Secrets Manager (`square-api-sbx`) and production token separately.
   - Locally, load sandbox token via `.env.local` or AWS profile (`AWS_PROFILE=guest-checkin-dev`) to ensure prod token is never referenced.
3. **Config Toggle**
   - Introduce env var `SQUARE_ENV=sandbox|production` consumed by Lambda dev server and frontend. Default to sandbox.

## Local AWS Stack
### Option A: LocalStack
- Run LocalStack for API Gateway, Lambda, DynamoDB, S3:
  ```bash
  localstack start -d
  aws --endpoint-url=http://localhost:4566 dynamodb create-table ...
  ```
- Deploy CDK stack with `cdk synth && cdk deploy --app 'npx aws-cdk@latest synth' --context localstack=1`.
- Point frontend `.env` to LocalStack endpoints (e.g., `VITE_API_BASE=http://localhost:4566/restapis/.../local/_user_request_`).

### Option B: SAM/Serverless Offline
- Use AWS SAM `sam local start-api` to run Lambda handlers + API Gateway emulation.
- Provide template with environment variables pointing to Square sandbox and DynamoDB Local (see below).

### DynamoDB Local
- Run `docker run -p 8000:8000 amazon/dynamodb-local`.
- Seed tables (passes, checkins, membership cache) using scripts under `scripts/seed-dynamo.mjs`.

## Frontend (Svelte) Dev Server
1. `npm install` inside new Svelte app (`apps/web`).
2. `.env.local`:
   ```
   VITE_API_BASE=http://localhost:3001/v1
   VITE_COGNITO_CLIENT_ID=...
   VITE_COGNITO_DOMAIN=http://localhost:8001
   VITE_SQUARE_ENV=sandbox
   ```
3. Run `npm run dev -- --open` to launch Svelte dev server; configure CORS on local API emulator to allow `http://localhost:5173`.

## Scanner/Kiosk Testing
- Attach USB barcode scanner (keyboard wedge). Verify it types into text fields.
- For camera testing, use `navigator.mediaDevices.getUserMedia`.
- Provide CLI to generate QR codes referencing sandbox order IDs:
  ```bash
  node scripts/gen-qr.js --order sq_sbox_order123 --output tmp/daypass.png
  ```
- Run kiosk route locally (`npm run dev -- --open /kiosk` inside `apps/web`) to simulate scanning; backend emulator should mark passes as redeemed in DynamoDB Local. The kiosk automatically keeps focus on the hidden input and replays scan history so you can confirm idempotency (redeemed day passes should return HTTP 409).

## Integration Tests
- Use Playwright to automate:
  - Day-pass purchase stub (mock webhook event) → scan → redemption.
  - Member login → display code → kiosk scan logs visit.
- Use environment-specific config (Playwright projects `local`, `sandbox`).
- Include scripts to replay Square webhook payloads against local API: `curl -X POST http://localhost:3001/v1/square/webhooks -d @fixtures/order-paid.json`.

## Safeguards
- Require explicit `--prod` flag for any script that uses production Square credentials.
- Use AWS IAM condition keys to prevent local profiles from accessing prod secrets.
- Build pre-commit check ensuring `.env` never contains prod tokens (git hook scanning for known prefixes).

## Observability During Local Runs
- Tail Lambda logs via `sam logs --tail` or LocalStack CloudWatch emulation.
- Provide `npm run monitor` script that aggregates DynamoDB Local state + API responses for quick debugging.

## Manual Validation Checklist
1. Start DynamoDB Local/localstack.
2. Run backend emulator (`npm run dev:api`).
3. Run Svelte frontend (`npm run dev:web`).
4. Seed sandbox orders (CLI script).
5. Generate QR for seeded order; scan via kiosk route.
6. Confirm DynamoDB Local shows redemption + check-in log.
7. Run Playwright suite pointing at localhost.

Following these steps ensures confidence before touching live Square data. When ready to hit production, swap `SQUARE_ENV` and redeploy; the runtime protections prevent accidental cross-environment usage.

