# Installation guide — Front Desk App

## Install

1. Run the Windows installer and finish the steps.
2. Open **Front Desk App**.
3. When asked, **paste your Square access token** once and click **Continue**. That is the only secret you need; everything else uses built-in production defaults.

The token is stored only on that computer (in the app’s user data folder). To change it later, delete the file **`square-access-token.txt`** in that folder and restart the app—you will be prompted again. On a typical PC the folder is under `%APPDATA%\front-desk-app`.

---

## After the app opens

In **Admin** (gear icon), set **Customer Segments** and **refresh** the membership cache so members show correctly. Details: [ADMIN_GUIDE.md](ADMIN_GUIDE.md).

Front desk daily operations (Search, Day pass, End-of-day download/email): [STAFF_GUIDE.md](STAFF_GUIDE.md).

---

## Developers

Build the installer: `npm install` → `npm run build` → `npm run dist`. For local runs without packaging, use a `.env` in the project root; see [QUICK_START.md](QUICK_START.md).

For **silent or automated** installs without using the welcome screen, set `SQUARE_ACCESS_TOKEN` in the environment before launch, or place a `resources/.env` next to the app that includes `SQUARE_ACCESS_TOKEN=...` (same order the app checks after the user token file).
