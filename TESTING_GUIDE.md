# Manual Testing Guide

## Quick Start

### Option 1: Browser Testing (Recommended for Development)

1. **Start the backend server** (in one terminal):
   ```bash
   npm run server
   ```
   This starts the Express API server on `http://localhost:3000`

2. **Start the frontend dev server** (in another terminal):
   ```bash
   npm run dev
   ```
   This starts Vite dev server on `http://localhost:5173`

3. **Open your browser**:
   - Navigate to `http://localhost:5173`
   - The app should load with the unified search interface

### Option 2: Electron Testing (Desktop App)

1. **Build the frontend first**:
   ```bash
   npm run build
   ```

2. **Start Electron**:
   ```bash
   npm start
   ```
   This will:
   - Start the Express server automatically
   - Launch the Electron window with the app

## Testing Modes

### Mock Mode (No Square API Required)

Set in `.env` file:
```env
VITE_USE_MOCK_API=true
```

This uses mock data from `src/mocks/mockData.ts` - perfect for testing UI and flow without Square credentials.

### Real Square API Mode

Set in `.env` file:
```env
VITE_USE_MOCK_API=false
SQUARE_ENVIRONMENT=sandbox  # or production
SQUARE_ACCESS_TOKEN=your_token_here
SQUARE_API_URL=https://connect.squareup.com/v2
SQUARE_API_VERSION=2025-10-16
PORT=3000
```

## Testing Scenarios

### 1. QR Code Scanning

**Test with USB Scanner:**
- The input field auto-focuses for scanner input
- Scan a QR code (or type a valid order ID like `CA1234567890`)
- The app should:
  - Detect it as a QR code (10+ alphanumeric characters)
  - Validate it via API
  - Show success or error message

**Manual Test:**
- Type a long alphanumeric string (e.g., `ORDER1234567890`) in the search field
- Press Enter or wait for auto-detection
- Should trigger QR validation

### 2. Manual Search

**Test Search Types:**
- **Name**: Type "John" or "Jane" - should search by name
- **Email**: Type "john@example.com" - should auto-detect as email
- **Phone**: Type "5551234567" or "(555) 123-4567" - should auto-detect as phone
- **Lot Number**: Type short alphanumeric like "LOT123" - should search by lot
- **Address**: Type "123 Main St" - should search by address

**Expected Behavior:**
- Shows loading state while searching
- Displays customer list if found
- Shows "No customers found" if no results
- Clicking a customer shows detail view

### 3. Customer Check-In Flow

1. **Search for a customer** (or scan QR code)
2. **Select customer** from list
3. **Select guest count**:
   - Use dropdown (1-10 guests)
   - Or select "Other" and enter custom number
4. **Check waiver status**:
   - If no waiver: Shows waiver QR code and "I've already signed" button
   - If waiver signed: Shows "Waiver Already Signed" message
5. **Click "Check In Now"** button
6. **See confirmation** screen with green checkmark
7. **Auto-dismisses** after 3 seconds

### 4. Error Handling

**Test Error Scenarios:**
- **Invalid QR Code**: Scan invalid order ID - should show "An issue with check-in, please see the manager on duty"
- **Network Error**: Stop backend server - should show error message
- **No Results**: Search for non-existent customer - should show "No customers found"
- **Missing Fields**: Try to check in without selecting guest count - should show error

### 5. Admin Features

1. **Select a customer** from search results
2. **Click Settings icon** (gear icon) in top right
3. **Admin View** should open showing:
   - Customer details (ID, name, email, phone, membership, lot, waiver status)
   - Waiver status update buttons (✓ to sign, ✗ to clear)

### 6. Offline Mode

**Test Offline Queue:**
1. Start the app normally
2. Stop the backend server (`Ctrl+C` in server terminal)
3. Try to check in a customer
4. Should queue the check-in
5. Restart backend server
6. Check-in should sync automatically (if sync logic is implemented)

## Browser DevTools

### Check Console for Errors
- Open browser DevTools (F12)
- Check Console tab for any JavaScript errors
- Check Network tab to see API requests

### Verify API Calls
- Network tab should show:
  - `POST /api/customers/search` - for searches
  - `POST /api/customers/validate-qr` - for QR validation
  - `POST /api/customers/check-in` - for check-ins
  - `GET /api/customers/names` - for initial customer list (if used)

## Common Issues

### "Cannot connect to API"
- **Fix**: Make sure backend server is running (`npm run server`)
- Check that port 3000 is not in use

### "Module not found" errors
- **Fix**: Run `npm install` to ensure all dependencies are installed

### Build errors
- **Fix**: Run `npm run build` to see detailed error messages
- Check that all Svelte components are properly formatted

### Styles not loading
- **Fix**: Ensure Tailwind is processing `.svelte` files (check `tailwind.config.js`)
- Restart the dev server

## Testing Checklist

- [ ] App loads without errors
- [ ] Search input auto-focuses
- [ ] QR code scanning works (or manual entry)
- [ ] Search by name works
- [ ] Search by email works
- [ ] Search by phone works
- [ ] Search by lot number works
- [ ] Customer list displays correctly
- [ ] Customer detail view shows
- [ ] Guest count selection works
- [ ] Waiver status displays correctly
- [ ] Check-in button works
- [ ] Confirmation screen appears
- [ ] Admin view opens
- [ ] Error messages display correctly
- [ ] App resets after confirmation

## Performance Testing

- **Bundle Size**: Check `dist/assets/` after build - should be ~50KB (much smaller than React version)
- **Load Time**: App should load quickly in browser
- **Responsiveness**: UI should be responsive and smooth

## Next Steps

After manual testing passes:
1. Run automated tests: `npm test`
2. Run E2E tests: `npm run test:e2e`
3. Build for production: `npm run build`
4. Test Electron build: `npm start`

