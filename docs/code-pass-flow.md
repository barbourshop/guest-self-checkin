<!-- scannable pass flows -->
# Scannable Pass & Membership Code Flows

## Goals
Support:
1. Non-member can pre-purchase a day pass online and arrive with a scannable credential (QR/EAN/short code).
2. Member can present either a pre-printed code sheet or authenticated URL on their phone.
3. Codes are revocable (single-use or multi-use) to mitigate misuse.
4. Front desk staff scan codes and the system logs/validates the visit.

## Components
- **Code Issuance Lambda (`code-issuer`)** – Generates secure tokens, stores metadata in DynamoDB (`passes` table) with status, type (member/day-pass), expiration, and redemption count.
- **Square Integration** – For day-pass purchases, Lambda listens to Square checkout webhooks to create/activate codes post-payment.
- **Member Portal** – Authenticated route where members view their code (QR + short fallback) and can download a printable PDF.
- **Front Desk Scanner App** – Web app (tablet/desktop) with camera/USB scanner support hitting `/passes/validate` to redeem codes.
- **Admin Console** – Allows revoking codes, viewing history, and reissuing replacements.

## Data Model (DynamoDB `passes`)
```json
{
  "pk": "PASS#<token>",        // base64url token
  "sk": "METADATA",
  "type": "day-pass" | "member",
  "owner": {
    "customerHash": "c0Zm...",
    "membershipType": "Member" | "Guest"
  },
  "status": "active" | "revoked" | "redeemed",
  "maxRedemptions": 1,
  "redeemedCount": 0,
  "validFrom": "2025-06-01T00:00:00Z",
  "validUntil": "2025-06-01T23:59:59Z",
  "metadata": {
    "purchaseId": "sq_123",
    "lotNumber": "A-12"
  }
}
```
- Indexes: `GSI1` on `owner.customerHash` for member portal, `GSI2` on `status` for admin views.

## Flows

### 1. Non-Member Day-Pass Purchase
1. Visitor hits Squarespace “Buy a Day Pass” page → embedded checkout powered by Square Web Payments or hosted checkout link.
2. After payment success, Square webhook (`/square/webhooks`) triggers `code-issuer`.
3. Lambda generates pass token:
   - Token = 128-bit random value (base32) for short code (8 chars) plus QR payload (`https://checkin.bigtreesrec.com/p/<token>`).
   - Stores metadata in DynamoDB with `type=day-pass`, `maxRedemptions=1`, `validUntil` for selected date.
4. Customer receives email with:
   - QR image (stored in S3 per-token, pre-signed link) + short fallback code.
   - Link to manage/resend (no login required; signed link with limited lifetime).
5. Optional: Provide “Add to Apple/Google Wallet” pass containing the token.

### 2. Member Code Distribution
- **Pre-printed**: Admin console bulk-generates codes for all active members (export PDF mailing). Each code stored with `maxRedemptions` = `unlimited` but `status` tied to membership segment; revocation simply toggles `status=revoked`.
- **Portal View**: Member logs into portal, `GET /passes/mine` returns active token(s). UI renders QR + short code and “Print” button. Since it's the same token, staff can scan from phone screen.
- Rotating codes: optionally regenerate token on demand, invalidating prior one (update DynamoDB record).

### 3. Revocation / Reissue
- Admin UI lists passes with filters (status, owner, creation date).
- To revoke: `POST /passes/<token>/revoke` sets `status=revoked`, writes audit log to EventBridge (`pass.revoked`).
- Reissue flow clones metadata but with new token. Previous token stays revoked to prevent reuse.

### 4. Front Desk Check-In & Logging
1. Staff app (also hosted on CloudFront) uses camera/USB scanner to read QR/short code.
2. App calls `POST /passes/validate` with `{ token, deviceId }`.
3. Lambda workflow:
   - Fetch pass record from DynamoDB.
   - Verify `status=active`, `validFrom/Until` window, and membership/day-pass rules.
   - For day-pass: mark `status=redeemed` (or increment `redeemedCount` if multi-use).
   - Emit EventBridge event `pass.redeemed` containing anonymized owner hash + timestamp.
   - Write entry to `checkins` table for analytics (shared with standard check-ins).
4. Response returns minimal info for staff display: `membershipType`, `guestNameInitials`, `guestCountAllowed`. UI shows confirmation screen similar to existing check-in confirmation.

### Security Considerations
- Tokens never encode PII; QR payload just contains opaque token.
- All token lookups happen server-side via HTTPS; hashed customer IDs keep privacy intact.
- Short codes limited to e.g. 8 base32 chars → 40 bits entropy; rate-limit `/passes/validate` to mitigate brute force, and optionally require device attestation for staff app.
- Revocation events propagate to CloudFront edge cache (if using caching) via invalidation or TTL < 5 min.

### Printing & Offline Support
- Generate PDF templates using AWS Lambda (e.g., Puppeteer on Lambda) or S3/Lambda@Edge to render member cards.
- For offline fallback, provide manual lookup interface in staff app: enter short code manually if scanner unavailable.

### Logging & Auditing
- Every issuance/revocation/redemption writes structured log (`passId`, `customerHash`, `action`, `actor`).
- DynamoDB Streams feed into S3/Firehose for audit retention.
- Admin console shows timeline per pass for quick investigations.

## Kiosk Mode (Hands-Free Scanner App)
- **Purpose**: Allow a dedicated kiosk device (desktop/tablet) with tethered barcode scanner to operate continuously without staff interaction beyond presenting codes.
- **Launch Flow**:
  - Special route `/kiosk` that auto-authenticates using a device credential (Cognito client credentials or pre-issued kiosk token stored securely).
  - On boot, kiosk displays large preview area (“Ready to Scan”) with minimal chrome; no keyboard/mouse input required.
- **Scanner Integration**:
  - Support USB HID scanners (which emulate keyboard entry) by focusing a hidden input that auto-submits when newline detected.
  - Optional camera scanning using Web APIs for fallback.
- **Auto-Processing**:
  - Each scan payload corresponds to a Square order ID or pass token; the kiosk immediately calls `/passes/validate`.
  - Responses drive prominent green/red states:
    - Success: Show confirmation banner with membership/day-pass info for 5 seconds, log check-in automatically.
    - Failure: Red banner with error reason (e.g., “Already redeemed”) plus auditory cue.
  - Kiosk logs every attempt locally (IndexedDB) for offline audit; syncs when connection restored.
- **No-Touch Operation**:
  - Idle screen saver (branding) when no activity for X minutes; scanner input instantly wakes it.
  - Admin-only shortcut (e.g., long-press corner + PIN) to exit kiosk, adjust settings, or re-link scanner.
- **Resilience**:
  - Heartbeat to backend to detect connectivity; show offline banner if API unreachable but still allow scans (queued until online).
  - Auto-refresh AppConfig (list of Square item IDs, limits) at interval to pick up changes without restart.


