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

1. Open **Front Desk Tools** (gear) → **Close Out Day** → **Download Report**.
2. Confirm the file downloads with a `.xlsx` extension (browser/Electron save to Downloads).
3. Open the file in Excel and verify it contains today’s check-ins (or headers only if none yet).
4. Optional: repeat after more check-ins — file should include new rows; DB is not cleared by download.

### 6. Error Handling

**Test Error Scenarios:**
- **Invalid QR Code**: Scan invalid order ID - should show "An issue with check-in, please see the manager on duty"
- **Network Error**: Stop backend server - should show error message
- **No Results**: Search for non-existent customer - should show "No customers found"
- **Missing Fields**: Try to check in without selecting guest count - should show error

### 7. Admin (supervisor)

1. From the home screen, open **Admin** (gear icon).
2. Confirm tabs load: **Membership**, **Customer Segments**, **Check-ins**, **Settings**.
3. **Check-ins** tab should list the **full** local history (not capped at 1000) and **Export to Excel** should download every row from `checkin.db`.

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
  - `GET /api/reports/daily-checkins/download` — front desk end-of-day Excel
  - `GET /api/reports/checkin-log/download` — admin full history Excel
  - `GET /api/admin/database` — admin dashboard (full check-in log, names from membership cache)
  - Optional: `POST /api/customers/validate-qr` — only if you exercise QR/order flows that call it

## Common Issues

### "Cannot connect to API"
- **Fix**: Make sure backend server is running (`npm run server`)
- Check that port 3000 is not in use

### "Module not found" errors
- **Fix**: Run `npm install` to ensure all dependencies are installed

### `better-sqlite3` / `NODE_MODULE_VERSION` errors when running tests
- **Cause**: The native SQLite module was built for a different Node version than the one running `npm test`.
- **Fix**: Run `npm test` again — `pretest` runs `scripts/ensure-native-modules.js` and rebuilds `better-sqlite3` automatically. Or run `npm rebuild better-sqlite3` manually after switching Node versions.

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

The `full-pipeline.yml` job `smoke-test-windows-app` silently installs the built `.exe`, then runs:

```powershell
pwsh -File scripts/smoke-test-windows-installed.ps1 -ExePath "<path-to-installed.exe>"
```

That script (no UI automation, **no localhost HTTP** — GHA cannot reach the in-app API reliably) checks:

- App process stays up until `%APPDATA%\front-desk-app\logs\app.log` contains `Server is running on http://127.0.0.1:`
- `%APPDATA%\front-desk-app\checkin.db` exists (writable user data, not Program Files only)
- After the app is stopped, `node scripts/verify-appdata-db.js` performs a direct SQLite read/write on that DB (and ensures it is not the legacy `resources\checkin.db` path)
- `app.log` does **not** contain known regressions (`readonly database`, `SQLITE_CANTOPEN`, `logger.warn is not a function`, etc.)

The smoke job sets `SQUARE_ACCESS_TOKEN` on the step (and seeds `%APPDATA%\front-desk-app\square-access-token.txt` before launch) so the packaged app does not block on the token setup dialog.

To run locally after installing on Windows:

```powershell
$env:SQUARE_ACCESS_TOKEN = 'your-token'
pwsh -File scripts/smoke-test-windows-installed.ps1 -ExePath "$env:LOCALAPPDATA\Programs\Front Desk App\Front Desk App.exe"
```

