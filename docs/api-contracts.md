<!-- api specs for mobile v2 -->
# API Contracts (AWS API Gateway + Lambda)

> All endpoints sit under `https://api.<env>.guestcheckin.com/v1`.  
> Authentication: Cognito User Pool JWT (Bearer). Admin-only routes require `scope:admin`.

## Shared Conventions
- **Headers**
  - `Authorization: Bearer <JWT>`
  - `x-device-id`: UUID from client (required for telemetry endpoints)
  - `x-request-id`: optional client-generated for tracing
- **Identifiers**
  - `customerHash`: `base64url(SHA-256(squareCustomerId + envSalt))`
  - No raw Square IDs or PII in request bodies.
- **Errors**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "No customer matches the supplied query",
    "retryable": false,
    "details": {
      "field": "query.phone"
    }
  }
}
```

## Endpoints

### POST `/customers/search`
Search Square for members while redacting PII in logs.

Request:
```json
{
  "query": {
    "type": "phone",
    "value": "+12095551234",
    "fuzzy": true
  },
  "includeMembershipMeta": true
}
```
- `type`: `phone | email | lot`
- Server never persists the `value`; only logs hashed variant.

Response:
```json
{
  "results": [
    {
      "customerHash": "c0Zm...g",
      "displayName": "Jamie L.",
      "membership": {
        "type": "Member",
        "segmentId": "gv2:TVR6JXEM4N5XQ2XV51GBKFDN74",
        "lastVerifiedAt": "2025-05-30T19:12:44Z"
      },
      "waiverHint": {
        "deviceRecognized": true,
        "lastAcknowledgedAt": "2025-05-29T16:05:00Z"
      }
    }
  ],
  "pagination": { "cursor": "eyJvZmZzZXQiOjUwfQ" }
}
```

### POST `/waiver/hint`
Stores anonymized waiver acknowledgement from device.

Request:
```json
{
  "customerHash": "c0Zm...g",
  "acknowledged": true,
  "source": "device",
  "waiverVersion": "2025-01",
  "acknowledgedAt": "2025-05-30T19:15:00Z"
}
```

Response: `204 No Content`

### POST `/checkins`
Records a check-in event and triggers downstream processing.

Request:
```json
{
  "customerHash": "c0Zm...g",
  "guestCount": 3,
  "waiverAcknowledged": true,
  "membershipContext": {
    "segmentId": "gv2:TVR6JXEM4...",
    "source": "client"
  }
}
```
Server actions:
1. Looks up Square customer via decrypted ID (mapping stored in DynamoDB cache).
2. Confirms membership segment, logs anonymized record in DynamoDB.
3. Emits EventBridge event `checkin.recorded`.

Response:
```json
{
  "checkinId": "chk_01J9DX3X1NAAW8",
  "processedAt": "2025-05-30T19:16:04Z",
  "confirmationExpiresAt": "2025-05-30T19:21:04Z"
}
```

### POST `/customers/resolve-hash`
Exchange `customerHash` for real Square ID (server-side only). Used internally; not exposed to browsers—invoked by Lambda using IAM auth. Documented here for completeness.

### GET `/metrics/daily` (admin)
Returns aggregated anonymized stats.

Query params: `?date=2025-05-30`

Response:
```json
{
  "date": "2025-05-30",
  "totalCheckins": 142,
  "uniqueHouseholds": 88,
  "guestDistribution": { "1": 50, "2": 30, "3": 10, "4+": 12 },
  "waiverAcknowledgementRate": 0.92
}
```

### POST `/square/webhooks`
Signature-validated endpoint for Square events (membership updates, customer merges).
- Uses API Gateway Lambda authorizer verifying Square signature header.
- Parses events, updates membership cache table, enqueues follow-up tasks via EventBridge.

### GET `/config`
Returns non-sensitive runtime config for the frontend.

Response:
```json
{
  "waiverVersion": "2025-01",
  "squareSearchLimit": 5,
  "featureFlags": {
    "enableQrScanner": true,
    "requireAuth": true
  }
}
```

## Error Handling
- Map internal errors to stable codes:
  - `SQUARE_UPSTREAM_ERROR` – include `retryAfter`.
  - `MEMBERSHIP_REQUIRED`
  - `WAIVER_NOT_ACKNOWLEDGED`
- API Gateway integration responses map Lambda exceptions → HTTP codes (400/401/403/409/429/500).
- Structured logs include `requestId`, `customerHash`, `deviceId` (when supplied).

## Rate Limits & Throttling
- Default: 10 requests/sec per Cognito identity for search.
- Check-ins limited to 3/minute per device to prevent spam.
- API Gateway usage plans configured per environment; CloudWatch alarms on 4XX/5XX spikes.

## Secrets & Config Dependencies
- Square access token secret ARN: `arn:aws:secretsmanager:...:secret:square-api-prod`.
- Hash salt stored in Secrets Manager as `customer-hash-salt`.
- Feature toggles retrieved from AppConfig at startup; Lambdas cache for 5 minutes.

