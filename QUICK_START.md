# Quick Start Guide

## Running the Application

### Demo Mode (Recommended for Development)
Demo mode uses mock Square service and a pre-seeded demo database. The database is automatically cleared and reseeded for repeatable results.

**One command to start everything:**
```bash
npm run demo
```

This will:
1. Clear the demo database
2. Seed it with demo data
3. Start both the backend server (port 3000) and frontend dev server (port 5173)
4. Open your browser to `http://localhost:5173`

**Or manually:**
```bash
# Initialize demo database (clears and seeds)
npm run demo:init

# Start both servers in demo mode
npm run demo:start

# Or start just the backend
npm run server:demo
```

### Production Mode
Production mode uses the real database (`checkin.db`) and does NOT auto-clear or reseed. The database is only modified through normal app operations.

```bash
npm run server:prod
# or simply
npm run server
```

## Running Tests

Tests automatically use test database (in-memory or `checkin.test.db`) and are isolated from production/demo databases.

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Database Files

- `checkin.db` - Production database (real data)
- `checkin.demo.db` - Demo database (pre-seeded, safe to delete)
- `checkin.test.db` - Test database (auto-managed by tests)

All database files are in `.gitignore` and should not be committed.

## Environment Variables

### For Demo Mode:
- `USE_DEMO_DB=true` - Use demo database
- `USE_MOCK_SQUARE_SERVICE=true` - Use mock Square service

### For Production Mode:
- No special variables needed (or set `USE_MOCK_SQUARE_SERVICE=false` for real API)

### For Tests:
- Automatically set: `NODE_ENV=test` and `USE_TEST_DB=true`

## Server Startup Messages

The server will display which mode it's running in:

- **Demo Mode**: `🎭 DEMO MODE: Using demo database with mock Square service`
- **Production Mode**: `🏭 PRODUCTION MODE: Using production database`

