## API Service Skeleton

This package hosts the AWS Lambda handlers backing the **v2 cloud** API (separate from the **Front Desk** Express server in `src/server`).

The `POST /v1/waiver/hint` route and related types are part of that **cloud** design only; the **desktop** check-in UI does not collect waivers.

### Scripts

```bash
# Start local dev server (Hono) that proxies to Lambda-style handlers
npm run dev

# Build with tsup (bundles handlers for Lambda)
npm run build

# Run unit tests (placeholder)
npm test
```

### Environment Variables

Set these in a `.env` file in this package (or export them) before `npm run dev`. Adjust IDs for your Square sandbox or environment.

```
SQUARE_ENV=sandbox
SQUARE_API_BASE_URL=https://connect.squareupsandbox.com/v2
SQUARE_API_VERSION=2025-10-16
SQUARE_LOCATION_ID=SANDBOX_LOC_ID
CUSTOMER_HASH_SALT=local-dev-salt
MEMBERSHIP_SEGMENT_ID=SEGMENT_ID
DAY_PASS_ITEM_IDS=ITEM_ID_1,ITEM_ID_2
MEMBERSHIP_ITEM_IDS=ITEM_ID_3
CONFIG_TABLE_NAME=local-config
PASSES_TABLE_NAME=local-passes
CHECKINS_TABLE_NAME=local-checkins
```

