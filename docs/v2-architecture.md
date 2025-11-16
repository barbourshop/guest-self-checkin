<!-- mobile-first architecture blueprint -->
# Guest Self Check-In v2 – AWS Architecture

## High-Level Topology
- **Client**: Mobile-first React app hosted in `S3` (static) fronted by `CloudFront` with device/browser storage for waiver flags and limited cached metadata.
- **Identity**: `Amazon Cognito` Hosted UI (passwordless/email magic links or OTP) enforcing authenticated API access plus optional admin groups.
- **API Tier**: `Amazon API Gateway` (REST) routes to `AWS Lambda` functions (Node.js). Lambda layers host shared domain logic extracted from v1 (guest lookup, membership rules, logging adapters).
- **Data & Messaging**:
  - `DynamoDB` tables for non-PII operational data (hashed Square IDs, anonymized event counters, device waiver hints).
  - `AWS AppConfig`/`SSM Parameter Store` for feature toggles and environment configuration.
  - `AWS Secrets Manager` for Square credentials and webhook secrets.
  - `Amazon EventBridge` + `SNS/SQS` for async notification (e.g., admin alerts, reconciliation jobs).
  - `S3` (separate bucket) for audit snapshots/exportable CSVs, with lifecycle to Glacier.
  - `AWS Step Functions` optionally orchestrate multi-step processes (e.g., nightly membership sync).
- **Observability**: `CloudWatch Logs + Metrics`, `X-Ray` tracing, `CloudTrail` for governance.

## Core Services & Responsibilities
| Domain | AWS Component(s) | Notes |
| --- | --- | --- |
| Static UI | S3, CloudFront, Route53 | CloudFront Functions inject security headers & geo restrictions. |
| Auth | Cognito User Pools, Identity Pools | Device-friendly Hosted UI; tokens cached in browser; admin scope for manual overrides. |
| Guest Search | API Gateway ➜ Lambda (`guest-search`) | Lambda pulls from Square API using app-level token stored in Secrets Manager; caches sanitized membership segment info in DynamoDB with TTL; never persist raw PII. |
| Waiver Tracking | Browser storage + Lambda (`waiver-hints`) | Device stores `waiverSignedAt` per hashed customer ID. API only receives hashed ID + boolean; DynamoDB stores hashed ID + lastSeen signature timestamp for analytics without PII. |
| Check-In Logging | Lambda (`checkin-log`) + DynamoDB Streams → S3 | Lambda validates membership/waiver states, writes anonymized record to DynamoDB; stream fan-out to S3 CSV export and EventBridge metrics. |
| Square Webhooks | API Gateway (webhook route) + Lambda (`square-sync`) | Processes membership updates, invalidates cache entries. |
| Admin Console | Same React app (role-based) + Cognito groups | Allows view of aggregated metrics, manual overrides (without exposing PII). |

## Data Flow Scenarios
1. **Guest Lookup**
   1. Browser hits `/customers/search` with hashed query (e.g., normalized phone/email hashed client-side + salted server-side) to reduce PII in transit logs.
   2. Lambda validates token via Cognito authorizer, decrypts Square credentials via Secrets Manager, queries Square `/customers/search` (direct PII exchange only server-side).
   3. Lambda strips sensitive fields, enriches with membership flags (from response or cached), and returns minimal dataset to client.
   4. Optional: store anonymized search telemetry `{hash, timestamp, resultCount}` in DynamoDB for usage metrics.
2. **Waiver State**
   - Browser persists `waiverSignedAt` in `IndexedDB/localStorage` keyed by hashed customer ID.
   - On check-in attempt, client sends hashed ID + boolean flag; backend cross-checks DynamoDB hints but treats Square membership as authority only.
   - No waiver info stored in Square; compliance handled locally plus optional aggregated counts (no PII) in DynamoDB.
3. **Check-In**
   - Client posts hashed ID + guest count + membership flag; Lambda fetches live membership from Square to prevent spoofing.
   - Lambda writes event to DynamoDB table (`checkins`) with hashed ID, membership type, guestCount, timestamp, deviceId.
   - DynamoDB Stream triggers Kinesis Firehose or Lambda to batch-write encrypted CSVs to S3 for reporting (replacing v1 CSV logs).

## Security & Configuration
- **Secrets**: Square access token, webhook signatures, and encryption salts stored in Secrets Manager; Lambdas load via rotation-ready environment variables referencing secret ARNs.
- **Configuration**: Parameter Store for non-secret config (segment IDs, feature flags), AppConfig for dynamic toggles (mock mode, maintenance).
- **IAM**: One IAM role per Lambda with least-privilege policies (DynamoDB table, Secrets Manager GetSecretValue, Parameter Store GetParameter, Square API egress). CloudFront Origin Access Control for S3.
- **PII Handling**: Only Lambda environment handles raw PII from Square; DynamoDB stores hashed IDs + derived metadata; logs redact values (structured logging middleware). Use AWS Macie to detect accidental PII in S3.

## Scaling & Reliability
- Auto-scaling inherent with Lambda/API Gateway; configure concurrency limits and DLQs for failure retries (SQS or EventBridge DLQ).
- Enable cached responses via API Gateway (short TTL) for frequent segment lookups to control Square API cost.
- Use AWS Shield Standard + WAF for CloudFront/API Gateway protection.
- Multi-environment strategy: dev/stage/prod stacks via CDK; each environment gets its own Cognito User Pool, DynamoDB tables, and Secrets.
- CI/CD: GitHub Actions → `cdk synth` + `cdk deploy` / `sam deploy`; CodePipeline optional for multi-account promotion.

## Migration Considerations
- Extract reusable logic from `src/server/services/*.js` into shared modules (e.g., `packages/domain-square`) callable from Lambdas.
- Replace CSV logger with DynamoDB writer + S3 exporter; import existing CSV logs into S3 for historical continuity.
- Provide QR deep links to hosted app; retire Electron installer gradually by running both stacks during pilot.

## Open Questions
- Authentication UX preference (OTP vs email link) for guests?
- Extent of admin capabilities needed in v2 (manual overrides, reporting)?
- Retention policy for anonymized check-in data (default 400 days per compliance?). 

