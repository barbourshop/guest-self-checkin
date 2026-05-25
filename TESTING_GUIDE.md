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

### Mock Square on the server (no real Square API)

Set in `.env` at the **repo root** (used by `src/server`):

```env
USE_MOCK_SQUARE_SERVICE=true
```

This swaps the server’s Square client for a mock implementation so you can exercise flows without Square credentials.

### Real Square API

Use a valid `SQUARE_ACCESS_TOKEN` (and usual Square URL/version vars). See [QUICK_START.md](QUICK_START.md) and [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).

## Testing Scenarios

### 1. Front desk search check-in (primary flow)

1. Start from the home screen.
2. Use **Search**.
3. Search by name/phone/email/lot.
4. Select a customer.
5. Set guest count and click **Check In Now**.
6. Confirm **All Set!** appears.

### 2. Day pass check-in

1. Click **Day pass** on the home screen.
2. Select guest count.
3. Click **Check in day pass**.
4. Confirm **All Set!** appears.

### 3. Optional card scanning flow

**Test with USB scanner:**
- In the search card, switch to scan mode.
- Scan a valid card token (or type one manually).
- Confirm the app finds the customer or prompts for selection.
- Complete check-in and confirm **All Set!**.

### 4. Manual search behavior

**Test Search Types:**
- **Name**: Type "John" or "Jane" - should search by name
- **Email**: Type "john@example.com" - should auto-detect as email
- **Phone**: Type "5551234567" or "(555) 123-4567" - should auto-detect as phone
- **Lot Number**: Type short alphanumeric like "LOT123" - should search by lot

**Expected Behavior:**
- Shows loading state while searching
- Displays customer list if found
- Shows "No customers found" if no results
- Clicking a customer shows detail view

### 5. End-of-day download flow

1. Click **End of day** in the top action row.
2. Click **Download Daily Checkins (Excel)**.
3. Confirm the file downloads with a `.xlsx` extension.
4. Open the file in Excel and verify it contains today’s check-ins.

### 6. Error Handling

**Test Error Scenarios:**
- **Invalid QR Code**: Scan invalid order ID - should show "An issue with check-in, please see the manager on duty"
- **Network Error**: Stop backend server - should show error message
- **No Results**: Search for non-existent customer - should show "No customers found"
- **Missing Fields**: Try to check in without selecting guest count - should show error

### 7. Admin (supervisor)

1. From the home screen, open **Admin** (gear icon).
2. Confirm tabs load: **Membership**, **Customer Segments**, **Check-ins**, **Settings**.
3. **Check-ins** tab should still support **Export to Excel** for supervisors (separate from front desk end-of-day download).

### 8. Offline / API down (optional)

If the API is unreachable, check-in may fail with a user-facing error. Behavior depends on network and Square availability; do not assume a silent offline queue unless you have verified it for your build.
## Browser DevTools

### Check Console for Errors
- Open browser DevTools (F12)
- Check Console tab for any JavaScript errors
- Check Network tab to see API requests

### Verify API Calls
- Network tab should show (paths are under `/api/customers`):
  - `POST /api/customers/search` — unified search from the home screen
  - `POST /api/customers/check-in` — member check-in
  - `POST /api/customers/check-in/daypass` — day pass
  - `GET /api/admin/database?enrich=true` — data used for the end-of-day Excel export on the home screen
  - Optional: `POST /api/customers/validate-qr` — only if you exercise QR/order flows that call it

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
- [ ] Search flow works (find, select, check in)
- [ ] Search by name works
- [ ] Search by email works
- [ ] Search by phone works
- [ ] Search by lot number works
- [ ] Day pass flow works
- [ ] End-of-day download works and opens in Excel
- [ ] Optional scan flow works
- [ ] Customer list displays correctly
- [ ] Customer detail view shows
- [ ] Guest count selection works
- [ ] Check-in button works
- [ ] Confirmation screen appears
- [ ] Admin view opens
- [ ] Error messages display correctly
- [ ] App resets after confirmation

## Performance Testing

- After `npm run build`, inspect `apps/web/build` asset sizes if you care about bundle weight.
- **Load Time**: App should load quickly in browser
- **Responsiveness**: UI should be responsive and smooth

## Next Steps

After manual testing passes:
1. Run automated tests: `npm test`
2. Build for production: `npm run build`
3. Test Electron build: `npm start`

Note: `npm run test:e2e` is currently a placeholder script in `package.json` (no Playwright suite attached).

## CI: Windows installed-app smoke test

The `full-pipeline.yml` workflow job `smoke-test-windows-app` silently installs the built `.exe`, then runs:

```powershell
pwsh -File scripts/smoke-test-windows-installed.ps1 -ExePath "<path-to-installed.exe>"
```

That script checks:

- `GET http://127.0.0.1:3000/api/health` succeeds
- `%APPDATA%\front-desk-app\checkin.db` is created (writable user data, not Program Files only)
- `%APPDATA%\front-desk-app\logs\app.log` contains `Server is running on http://localhost:`
- `app.log` does **not** contain known regressions (`logger.warn is not a function`, `readonly database`, `SQLITE_CANTOPEN`, `unable to open database file`)

Requires GitHub Actions secrets for Square (`SQUARE_ACCESS_TOKEN`, etc.) so the packaged server can start without the token setup dialog.

