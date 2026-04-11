# Admin guide — day-to-day

For **supervisors or managers** who support the check-in PC and Square, not for reading code.

- Front desk steps: [STAFF_GUIDE.md](STAFF_GUIDE.md)  
- First-time install (Square token on first launch): [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)

---

## Square and the app (short version)

Customer **names, phones, emails, and lots** live in **Square**. The app decides **member vs non-member** from **customer segments** you maintain in the app’s **Admin** area (which segments count as membership). If something is wrong for a person, it is almost always fixed in **Square** (their profile or which group they are in), then you **refresh the membership cache** in Admin if the app still looks stale.

---

## Opening Admin

On the check-in home screen, click the **gear** icon. You will leave the home screen; click **Home** when you are done to return to check-in.

Only people you trust with member data and exports should use this screen.

---

## What each Admin tab is for

**Membership** — See who is in the membership cache, whether the cache is up to date, and **refresh** or **clear** it after you change segments or if many searches look wrong. Use the **Card** (ID icon) on a row to open a printable member card when needed.

**Customer Segments** — Choose which Square **segments** count as members. After any change here, go to **Membership** and refresh the cache.

**Check-ins** — See recent check-ins and use **export** when you need a file for accounting or reporting.

**Settings** — Shortcuts such as opening the **card generator** for manual order IDs; other items depend on how your site configured the app.

---

## Getting check-in / access records

**Easiest:** In Admin, open the **Check-ins** tab and use the **export** control. Save the file somewhere your organization keeps reports.

**Optional — files on the check-in PC:** The app also writes a **daily CSV** of check-ins (one file per calendar day). On a typical Windows install you can open File Explorer, click the address bar, paste:

`%APPDATA%\front-desk-app\logs\checkins`

and press Enter. You should see files named like `04-11-26-check-ins.csv`. If that folder is empty or missing, ask whoever installed the app for the exact data folder for your build.

Those files are mainly for backup or IT; supervisors can rely on the **Check-ins** export for routine reporting.

---

## Common issues (what to try first)

| Situation | What to try |
|-----------|-------------|
| One person’s name or phone is wrong | Update them in **Square**, then search again. |
| One person shows the wrong membership | In Square, fix their **segment** (or group) for your program; in Admin **Membership**, **refresh** the cache. |
| Many people wrong or “empty” | Admin → **Customer Segments** — confirm the right segments are selected; **Membership** — **refresh** cache. If it still fails, call IT (Square or network may be down). |
| App window blank or won’t open | Fully close the app and reopen. Check that the PC is online. If it persists, call **IT** and tell them the date and time; they can check log files on that PC. |
| “See the manager on duty” / check-in errors | Note what the guest was doing (search, day pass, scan). Call **IT** if it keeps happening after a restart. |

---

## When to involve IT or your installer

- First-time setup, new PC, or new Square credentials: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).  
- Deep Square API or developer topics: [docs/square-integration.md](docs/square-integration.md) (technical).
