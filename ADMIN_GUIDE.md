# Admin guide

Overview and troubleshooting guide for **supervisors or managers** who support the Front Desk Check In App and/or Square account

## Square and the app

Customer **names, phones, emails, and lots** live in **Square**. In Square, you use **Smart Filters** to group customers by membership type; in the Square API these appear as **customer segments**. In this app, Admin is configured with which customer segments count as each membership group for check-in. If there is a membership issue, first run **Refresh Cache** in Admin. If that does not fix it, escalate to a **manager** so they can review the guest in Square and diagnose further.

---

## Opening Admin

On the check-in home screen, click the **gear** icon. You will leave the home screen; click **Home** when you are done to return to check-in.

**Admin password:** `PoolParty`

This password is only to prevent accidental changes at the front desk. It is not intended to protect highly sensitive data.

Only people you trust with member data and exports should use this screen.

---

## What each Admin tab is for

**Membership** — See who is in the membership cache, whether the cache is up to date, and **refresh** or **clear** it after you change segments or if many searches look wrong. Use the **Card** (ID icon) on a row to open a printable member card when needed.

**Customer Segments** — Choose which Square **segments** count as members. After any change here, go to **Membership** and refresh the cache.

![Customer segments list in Admin](docs/images/admin-membership-segment-list.png)

**Check-ins** — See recent check-ins and use **export** when you need an admin-side historical file.

**Settings** — Shortcuts such as opening the **card generator** for manual order IDs; other items depend on how your site configured the app.

---

## First-time setup: choose member segments and build cache

Use this once on a new install (or anytime your program changes which Square groups count as members).

1. Open **Admin** from the home screen gear icon and enter the password.
2. Go to **Customer Segments**.
3. Click the fetch/sync control to pull the latest segment list from Square.
4. In the segment list, select the segments that should count as **membership** for your site.
5. Save/apply your segment selections.
6. Go to **Membership** and click **Refresh Cache**.
7. Wait for refresh to finish, then confirm members appear in the membership list and test one search on the front desk screen.

![Fetch segments from Square in Admin](docs/images/admin-segment-fetch-from-square.png)

![Customer segments list in Admin](docs/images/admin-membership-segment-list.png)

![Admin membership tab after refresh](docs/images/admin-membership-after-refresh-cache.png)

If results still look wrong after refresh, verify the guest is assigned to one of the selected Square segments, then run **Refresh Cache** again.

---

## Getting check-in / access records

**Front desk daily close-out (recommended):** Use the home screen **End of day** action to download the daily Excel file, then email it to the manager.

**Admin export (supervisor use):** In Admin, open the **Check-ins** tab and use the **export** control when you need additional reporting or historical slices.

**Optional — files on the check-in PC:** The app also writes a **daily CSV** of check-ins (one file per calendar day). On a typical Windows install you can open File Explorer, click the address bar, paste:

`%APPDATA%\front-desk-app\logs\checkins`

and press Enter. You should see files named like `04-11-26-check-ins.csv`. If that folder is empty or missing, ask whoever installed the app for the exact data folder for your build.

Those files are mainly for backup or IT; routine daily handoff should use the front desk **End of day** download flow.

---

## Common issues (what to try first)

| Situation | What to try |
|-----------|-------------|
| One person’s name or phone is wrong | Update them in **Square**, then search again. |
| One person shows the wrong membership | In Square, fix their **segment** (or group) for your program; in Admin **Membership**, **refresh** the cache. |
| Many people wrong or “empty” | Admin → **Customer Segments** — confirm the right segments are selected; **Membership** — **refresh** cache. If it still fails, call IT (Square or network may be down). |
| App window blank or won’t open | Fully close the app and reopen. Check that the PC is online. If it persists, call **IT** and tell them the date and time; they can check log files on that PC. |
| “See the manager on duty” / check-in errors | Note what the guest was doing (search, day pass, scan). Call **IT** if it keeps happening after a restart. |

If segments changed in Square and the app still looks stale, use the segment fetch action in Admin and then refresh membership cache.

![Fetch segments from Square in Admin](docs/images/admin-segment-fetch-from-square.png)

