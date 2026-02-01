# Quick Start Guide

## Running the Application

### Production (with dev frontend)
```bash
npm run prod
```
Starts the backend server (port 3000) and SvelteKit dev server (port 5173). Open `http://localhost:5173`. The frontend proxies API requests to the backend.

### Backend only
```bash
npm run server
```
Serves the API on port 3000. Run `npm run build` then serve the built app from `dist/` if you need the UI from the same process.

### Frontend only (dev)
```bash
npm run dev
```
Runs the SvelteKit app in `apps/web/`. Configure `PUBLIC_API_BASE_URL` or use the Vite proxy to point at your backend.

## Running Tests

```bash
npm test
npm run test:watch
```

Tests use the test database and are isolated from production.

## Environment Variables

- **Production**: No special variables. Set `SQUARE_ACCESS_TOKEN` and optionally `MEMBERSHIP_SEGMENT_ID` (or configure segments in Admin).
- **Mock Square (testing)**: `USE_MOCK_SQUARE_SERVICE=true`
- **Tests**: `NODE_ENV=test` is set automatically by the test script

## Database

- `checkin.db` - Production database (created on first run)
- Add customer segments in Admin → Segments, then refresh the membership cache
