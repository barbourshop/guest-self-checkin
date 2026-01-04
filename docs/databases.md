# Database Configuration

This application uses SQLite databases and supports three distinct database types:

## Database Types

### 1. Production Database (`checkin.db`)
- **Location**: Project root directory
- **Usage**: Production and normal development
- **When Used**: Default when no special environment variables are set
- **Data**: Real customer data from Square API

### 2. Demo Database (`checkin.demo.db`)
- **Location**: Project root directory
- **Usage**: Development with mock Square service
- **When Used**: When `USE_DEMO_DB=true` environment variable is set
- **Data**: Pre-seeded with demo customer data for testing UI and workflows
- **Seed Command**: `npm run seed:demo`

### 3. Test Database (`checkin.test.db` or in-memory)
- **Location**: Project root directory (file-based) or in-memory
- **Usage**: Automated tests
- **When Used**: When `NODE_ENV=test` or `USE_TEST_DB=true`
- **Data**: Created fresh for each test run, cleaned up after tests
- **Note**: Most tests use in-memory databases via `testDatabase.js` helpers

## Environment Variables

### Database Selection
- `DATABASE_PATH` - Explicit path to database file (overrides all other settings)
- `USE_DEMO_DB=true` - Use demo database (`checkin.demo.db`)
- `USE_TEST_DB=true` - Use test database (`checkin.test.db`)
- `NODE_ENV=test` - Automatically uses test database
- `ELECTRON_USER_DATA` - Path to Electron user data directory (for packaged app)

### Square Service Selection
- `USE_MOCK_SQUARE_SERVICE=true` - Use mock Square service instead of real API

## Usage Examples

### Demo Mode (Recommended for Development)
Demo mode automatically clears and reseeds the demo database for repeatable results:

```bash
# One command: clears, seeds, and starts both backend and frontend
npm run demo
```

This will:
- Clear and seed the demo database
- Start backend server on port 3000
- Start frontend dev server on port 5173
- Open browser to `http://localhost:5173`

Or manually:
```bash
# Initialize demo database (clears and seeds)
npm run demo:init

# Start both servers in demo mode
npm run demo:start

# Or start just the backend
npm run server:demo
```

### Production Mode
Production mode uses the real database and does NOT auto-clear/reseed:

```bash
# Start server in production mode
npm run server:prod
# or simply
npm run server
```

### Running Tests
Tests automatically use test database (in-memory or test.db file):

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Tests are automatically configured to:
- Use `NODE_ENV=test` and `USE_TEST_DB=true`
- Clean up test database before and after tests
- Use in-memory databases by default (via `testDatabase.js` helpers)

## Seeding Demo Data

The demo database can be seeded with realistic sample data:

```bash
npm run seed:demo
```

This will:
- Create/clear `checkin.demo.db`
- Add demo customers from `mockSquareHelpers.js`
- Populate membership cache
- Add sample check-in logs

## Database Files

All database files are stored in the project root:
- `checkin.db` - Production/development database
- `checkin.demo.db` - Demo database (can be safely deleted and re-seeded)
- `checkin.test.db` - Test database (auto-created during tests, can be deleted)

## Important Notes

1. **Never commit database files** - They are in `.gitignore`
2. **Demo database is safe to delete** - Re-run `npm run seed:demo` to recreate
3. **Test database is auto-managed** - Tests clean up after themselves
4. **Production database contains real data** - Handle with care

