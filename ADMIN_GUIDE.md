# Admin guide

Overview and troubleshooting guide for **supervisors or managers** who support the Front Desk Check In App and/or Square account

## Square and the app

Customer **names, phones, emails, and lots** live in **Square**. In Square, you use **Smart Filters** to group customers by membership type; in the Square API these appear as **customer segments**. In this app, Admin is configured with which customer segments count as each membership group for check-in.

---

## Opening Admin

On the check-in home screen, click the **gear** icon to open **Front Desk Tools**.  
In the Front Desk Tools panel, click the **Admin Dashboard** link to access the Admin area.

![Front Desk Tools - admin access link](docs/images/front-desk-tools.png)

When you are finished, click **Home** to return to the main check-in screen.

**Admin password:** `PoolParty`

This password is only to prevent accidental changes at the front desk. It is not intended to protect highly sensitive data.

Only people you trust with member data and exports should use this screen.

![Admin membership tab after refresh](docs/images/admin-membership-after-refresh-cache.png)


---

## What each Admin tab is for

**Membership** — See who is in the membership cache, whether the cache is up to date, and **refresh** or **clear** it after you change segments or if many searches look wrong. Use the **Card** (ID icon) on a row to open a printable member card when needed.

**Customer Segments** — Choose which Square **segments** count as members. After any change here, go to **Membership** and refresh the cache.

**Check-ins** — See recent check-ins and use **export** when you need an admin-side historical file.

**Settings** — Shortcuts such as opening the **card generator** for manual order IDs; other items depend on how your site configured the app.

---

## Install and first launch

Use this when setting up a new front desk PC.

1. Run the Windows installer and finish the steps.
2. Open **Front Desk App**.
3. When asked, paste your **Square access token** and click **Continue**.

The token is stored only on that computer in `square-access-token.txt` under the app user-data folder (typically `%APPDATA%\front-desk-app`). To change the token later, delete that file and restart the app to be prompted again.

### If installer security warnings appear

Only bypass these warnings if the installer came from your trusted internal source.

- **Windows (SmartScreen):** In the warning window, click **More info** and then **Run anyway**.
- **macOS (Gatekeeper):**
  1. Try opening the app once so macOS shows the warning.
  2. Open **System Settings** -> **Privacy & Security**.
  3. Under the blocked app message, click **Open Anyway**, then confirm.
  4. If prompted again, right-click the app and choose **Open** to approve it.

If these options are unavailable, contact IT/admin support to verify the installer file and permissions on that computer.

---

## First-time setup

Use this once on a new install (or anytime your program changes which Square groups count as members).

1. Open **Admin** from the home screen gear icon and enter the password.
2. Go to **Customer Segments**.
3. Click the fetch/sync control to pull the latest segment list from Square.
![Fetch segments from Square in Admin](docs/images/admin-segment-fetch-from-square.png)
4. In the segment list, select the segments that should count as **membership** for your site.
5. Save/apply your segment selections.
![Customer segments list in Admin](docs/images/admin-membership-segment-list.png)
6. Go to **Membership** and click **Refresh Cache**.
7. Wait for refresh to finish, then confirm members appear in the membership list and test one search on the front desk screen.
![Admin membership tab after refresh](docs/images/admin-membership-after-refresh-cache.png)

---

## Common actions

### Refresh membership cache

Use this after changing customer segments in Square or when many member searches look wrong.

1. Open **Admin** and go to **Membership**.
2. Click **Refresh Cache** and wait for completion.
3. Test one member search from the front desk home screen.

If results still look wrong, verify the guest is assigned to one of the selected Square segments, then use the segment fetch action in **Customer Segments** and refresh cache again.

### Create and download member ID card images

Use this when a member needs a printable or shareable card image.

1. Open **Admin** and go to **Membership**.
2. Find the member and click the **Card** icon on their row.
3. On the Member Card page, confirm the member details and barcode/QR setting.
4. Click **Download ID Card (PNG)** to save the image file.

![Member card page and PNG download button](docs/images/membership-card.png)

You can then use the PNG in several ways:
- Print at home on standard paper, then trim to size.
- Print in office (paper or card stock) and laminate for longer use.
- Keep/send the PNG digitally (email, cloud folder, or phone) when a physical card is not needed.

### Get check-in / access records

**Front desk daily close-out (recommended):** Use the home screen **End of day** action to download the daily Excel file, then email it to the manager.

**Admin export (supervisor use):** In Admin, open the **Check-ins** tab and use the **export** control when you need additional reporting or historical slices.

**Optional — files on the check-in PC:** The app also writes a **daily CSV** of check-ins (one file per calendar day). On a typical Windows install you can open File Explorer, click the address bar, paste:

`%APPDATA%\front-desk-app\logs\checkins`

and press Enter. You should see files named like `04-11-26-check-ins.csv`. If that folder is empty or missing, ask whoever installed the app for the exact data folder for your build.

Those files are mainly for backup or IT; routine daily handoff should use the front desk **End of day** download flow.

---

## Troubleshooting (what to try first)

| Situation | What to try |
|-----------|-------------|
| One person’s name or phone is wrong | Update them in **Square**, then search again. |
| One person shows the wrong membership | In Square, fix their **segment** (or group) for your program; in Admin **Membership**, **refresh** the cache. |
| Many people wrong or “empty” | Admin → **Customer Segments** — confirm the right segments are selected; **Membership** — **refresh** cache. If it still fails, call IT (Square or network may be down). |
| App window blank or won’t open | Fully close the app and reopen. Check that the PC is online. If it persists, call **IT** and tell them the date and time; they can check log files on that PC. |
| “See the manager on duty” / check-in errors | Note what the guest was doing (search, day pass, scan). Call **IT** if it keeps happening after a restart. |

For any membership issue, first run **Refresh Cache** in Admin. If that does not fix it, escalate to a **manager** so they can review the guest in Square and diagnose further.
