# Admin guide — Front Desk App and Square

For **supervisors and IT** who support check-in, Square customer data, and the installed **Front Desk App** (Windows / Electron).

Front desk daily steps: [STAFF_GUIDE.md](STAFF_GUIDE.md).

---

## 1. Square is the source of truth

- Customer **profiles** (name, phone, email, lot/reference id) live in **Square**.
- **Who counts as a member** for this app is driven by **Square Customer Directory segments** you configure in the app’s Admin area (see below), not by staff typing overrides at check-in.
- If a member shows the wrong name, contact info, or membership: fix it in **Square** (and refresh the membership cache if needed).

---

## 2. Opening Admin

1. On the check-in home screen, click the **gear** (settings) icon in the header.
2. The app navigates to the **Admin** page. Use **Home** in Admin to return to check-in.

Restrict who can use Admin in line with your policies (physical access to the PC, Windows user accounts, etc.). The app does not replace your facility’s access-control policy.

---

## 3. Admin tabs (what each is for)

### Membership

- Shows the **membership cache**: customers the app considers members, based on your **Customer Segments** configuration.
- **Membership cache** section: status (e.g. up to date, stale, empty), **last updated**, and actions to **refresh** or **clear** the cache. Refresh after you change which Square segments count as members, or if check-in search looks wrong for many people.
- Table: filter/sort, inspect cached rows. The **Card** column (ID card icon) opens the **member card** page to print or show a QR/barcode—useful for replacement cards.

### Customer Segments

- Defines **which Square customer segments** define “member” for search badges and cache refresh.
- You can **fetch segments from Square** and add the ones your organization uses. After changes, refresh the membership cache on the **Membership** tab.

### Check-ins

- Review recent check-in log rows from the app database.
- **Export** (e.g. spreadsheet) is available for reporting—use your organization’s retention rules for downloaded files.

### Settings

- Operational hints; **Open card generator** opens `/member-card` when you need to type an order ID manually (also described on this tab).
- Other options here reflect **server configuration**; production tokens and URLs belong in `.env` / deployment (see [QUICK_START.md](QUICK_START.md) or your internal runbook).

---

## 4. Logs and files (troubleshooting and audit)

### Check-in CSV (metrics)

The server appends one row per successful check-in to a **daily CSV**:

- **Columns:** `timestamp`, `customerId`, `guestCount`, `firstName`, `lastName`, `lotNumber`
- **Filename pattern:** `MM-DD-YY-check-ins.csv` (US-style month-day-year in the name).
- **Directory:** under `checkins/` inside the configured log root. If `CHECKIN_LOG_DIR` is set, files go to `CHECKIN_LOG_DIR/checkins/`. Otherwise the default is `logs/checkins/` relative to the server process working directory.

**Electron (packaged Front Desk App):** `main.js` sets `CHECKIN_LOG_DIR` to the app’s user data **logs** folder, so CSV files typically appear next to other app logs (see below), under a `checkins` subfolder.

### Electron main log

The packaged app writes a rolling text log for the main process and server output, for example:

- Path shape: `%APPDATA%\front-desk-app\logs\app.log` on Windows (exact folder name can vary with `package.json` **name** / build; confirm on the PC if needed).

Use this when the window is blank, the server will not start, or you need raw error text for IT.

---

## 5. Operational checklist

| Symptom | What to try |
|--------|-------------|
| Everyone shows non-member or search is empty | Confirm Square token and environment in `.env`; in Admin **Customer Segments**, confirm segments; **refresh** membership cache. |
| One person wrong | Fix customer or segment assignment in **Square**; refresh cache or wait for cache TTL depending on your setup. |
| App won’t load | Restart Front Desk App; check `app.log`; confirm network and that nothing else is blocking `localhost` on the configured port. |
| Day pass or check-in API errors | Read server log / `app.log`; verify Square and server are reachable. |

---

## 6. Related docs (technical)

- [docs/square-integration.md](docs/square-integration.md) — Square API behavior and identifiers.
- [QUICK_START.md](QUICK_START.md) — local run and environment variables (developers / IT).
