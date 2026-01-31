# Database Configuration

This application uses SQLite databases.

## Database Types

### 1. Production Database (`checkin.db`)
- **Location**: Project root directory
- **Usage**: Production and development
- **When Used**: Default when no special environment variables are set
- **Data**: Customer data from Square API (membership cache, segments, check-in log)

### 2. Test Database (`checkin.test.db` or in-memory)
- **Location**: Project root directory (file-based) or in-memory
- **Usage**: Automated tests
- **When Used**: When `NODE_ENV=test` or `USE_TEST_DB=true`
- **Data**: Created fresh for each test run, cleaned up after tests

## Environment Variables

### Database Selection
- `DATABASE_PATH` - Explicit path to database file (overrides all other settings)
- `USE_TEST_DB=true` - Use test database (`checkin.test.db`)
- `NODE_ENV=test` - Automatically uses test database
- `ELECTRON_USER_DATA` - Path to Electron user data directory (for packaged app)

### Square Service
- `USE_MOCK_SQUARE_SERVICE=true` - Use mock Square service instead of real API (for testing)

## Usage

### Production
```bash
# Start server
npm run server

# Or with frontend (dev)
npm run prod
```

### Running Tests
```bash
npm test
npm run test:watch
```

Tests use the test database and are isolated from production.

## Database Files

- `checkin.db` - Production/development database
- `checkin.test.db` - Test database (auto-created during tests)

Database files are in `.gitignore` and should not be committed.
