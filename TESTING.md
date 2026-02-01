# Testing Guide

This document explains how to run tests for the check-in app revamp components.

## Quick Start

Run all new tests:
```bash
npm test -- --testPathPattern="mockSquareService|database|squareService"
```

Run with coverage:
```bash
npm test -- --testPathPattern="mockSquareService|database|squareService" --coverage
```

## Test Files

### 1. Mock Square Service Tests
**File**: `src/server/services/__tests__/mockSquareService.test.js`

Tests the mock Square API service that allows testing without connecting to real Square:
- Customer management (add, retrieve, search)
- Order management
- Membership checking (by segment and catalog item)
- Check-in order verification
- Error simulation (network failures, delays)

**Run**: `npm test -- mockSquareService`

### 2. Database Tests
**File**: `src/server/db/__tests__/database.test.js`

Tests the SQLite database schema and operations:
- Schema creation (tables and indexes)
- Membership cache operations (insert, update, retrieve)
- Check-in queue operations
- Check-in log operations
- Database cleanup utilities

**Run**: `npm test -- database`

### 3. Square Service Integration Tests
**File**: `src/server/services/__tests__/squareService.test.js`

Tests the enhanced Square service using the mock:
- Customer search (email, phone, name)
- Membership checking by catalog item/variant
- Check-in order verification
- Error handling

**Run**: `npm test -- squareService`

## What's Tested

### ✅ Mock Square Service
- Customer CRUD operations
- Customer search (email, phone, lot, name)
- Order management
- Membership verification (segment and catalog item)
- Check-in order validation
- Network error simulation

### ✅ Database
- All three tables created correctly
- Membership cache: insert, update, retrieve
- Check-in queue: insert, status updates
- Check-in log: insert operations
- Database cleanup utilities

### ✅ Square Service Integration
- Customer search functionality
- Catalog item/variant membership checking
- Check-in order verification (valid/invalid scenarios)
- Error handling

## Test Results

All 34 tests should pass:
- 9 tests for Mock Square Service
- 9 tests for Database Utilities  
- 10 tests for Square Service Integration
- 6 additional tests for error scenarios

## Running Tests

```bash
# Run all new tests
npm test -- --testPathPattern="mockSquareService|database|squareService"

# Run specific test suite
npm test -- mockSquareService
npm test -- database
npm test -- squareService

# Run with watch mode
npm test -- --watch --testPathPattern="mockSquareService|database|squareService"

# Run with coverage
npm test -- --coverage --testPathPattern="mockSquareService|database|squareService"
```

## Next Steps

These tests verify that:
1. ✅ Mock Square service works correctly for testing
2. ✅ Database schema and operations function properly
3. ✅ Enhanced Square service methods work with mocked data

You can now proceed with confidence that:
- The mock service can be used to test logic without real Square API
- Database operations work correctly
- Catalog item/variant checking logic is correct

