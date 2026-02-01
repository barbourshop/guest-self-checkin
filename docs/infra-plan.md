<!-- infrastructure & ops plan -->
# Infrastructure, Operations, and Migration Plan

## IaC Strategy
- **Framework**: AWS CDK (TypeScript) mono-repo under `infra/`.
- **Stacks**
  - `NetworkStack` (if needed) – VPC for private Lambdas hitting Square via NAT Gateway (optional; lambda-outbound via NAT for fixed IP allowlists).
  - `AppStack` – API Gateway, Lambda functions, DynamoDB tables, EventBridge bus/rules, S3 buckets, CloudFront distribution, Cognito pools.
  - `ObservabilityStack` – CloudWatch dashboards/alarms, X-Ray groups, AWS Chatbot notifications.
  - `PipelineStack` – CodePipeline/CodeBuild (optional) triggered by GitHub OIDC.
- **Environments**: `dev`, `stage`, `prod` with per-env context in `cdk.context.json`. No shared resources except artifact buckets.
- **Configuration Sources**
  - Static config via CDK props.
  - Runtime toggles via AWS AppConfig profiles + deployment strategies (validators ensure JSON schema).

## CI/CD Flow
1. Developer pushes branch → GitHub Actions runs lint/tests + `npm run test:infra` (cdk synth).
2. On merge to `main`, GitHub OIDC role triggers CodePipeline:
   - **Build**: `npm ci`, `npm run build`, `npm run cdk synth`.
   - **Deploy-dev**: `cdk deploy AppStack-dev`.
   - **Integration tests**: smoke tests via Playwright hitting dev API.
   - Manual approval → deploy to stage → automated regression tests.
   - Manual approval → prod deploy (blue/green alias for Lambda with canary traffic shifting).
3. Artifacts (static site) uploaded to S3 versioned bucket; CloudFront invalidation automated.

## Secrets & Config Management
- **Secrets Manager**: Square tokens, webhook secrets, hash salts. Rotation Lambda updates Square token monthly (if supported).
- **Parameter Store**: Non-sensitive config (waiver version, search limits). Namespaced `/guest-checkin/<env>/`.
- **Env Vars**: Lambdas load minimal env vars (TABLE_NAME, SECRET_ARN). Avoid hardcoding.

## Monitoring & Alerting
- CloudWatch Logs structured JSON; embed `requestId`, `customerHash`, `deviceId`.
- Metrics:
  - API Gateway 4XX/5XX, latency.
  - Lambda errors, duration, throttles.
  - DynamoDB read/write capacity, throttles.
  - CloudFront cache hit rate.
- Alarms -> SNS -> Slack (AWS Chatbot). Pager rotation for prod incidents.
- Tracing: AWS X-Ray + Powertools for AWS Lambda (Node.js) to auto capture traces/metrics.
- Cost monitoring via AWS Budgets notifications + Cost Explorer reports.

## Data Management
- DynamoDB tables encrypted with KMS CMK per env.
- Point-in-time recovery enabled; exports to S3 for analytics monthly.
- S3 audit bucket lifecycle: 30 days standard → 365 days Glacier → delete.
- No PII stored; hashed IDs only. Run automated Macie scans on audit bucket monthly.

## Migration Steps (v1 ➜ v2)
1. **Readiness**: Import existing Square segment IDs/config into Parameter Store; seed Secrets Manager with API tokens.
2. **Data Backfill**: Run script (Lambda or AWS Batch) to hash Square customer IDs and populate membership cache table.
3. **Dual Run**: Operate Electron v1 + new web app concurrently; staff uses new mobile version while kiosk remains fallback.
4. **Cutover**:
   - Publish QR codes linking to CloudFront domain.
   - Disable waiver custom attribute writes in v1 (feature flag) once local waiver storage validated.
5. **Decommission**:
   - Stop shipping Electron builds.
   - Archive historical CSV logs to S3 for retention; remove local log directory watchers.

## Operations Runbook
- **Deploy Rollback**: `cdk deploy AppStack-prod --previous-versions` (or AWS Console revert Lambda alias). Static assets revert via CloudFront versioned key.
- **Square Outage Handling**: Graceful degradation – cached membership TTL 6h; API flags `squareStatus: degraded`. Staff notified via SNS.
- **Incident Response**:
  1. CloudWatch alarm -> Slack.
  2. Triage logs via CloudWatch Insights queries (prebuilt saved queries).
  3. If customer-facing outage, update status page (StatusPage/Route53 health check) and send admin email via SES.

## Future Enhancements
- Add AWS AppSync GraphQL facade if offline sync becomes requirement.
- Consider AWS Amplify Hosting for simplified static deploys if infra complexity needs reduction.
- Evaluate AWS Clean Rooms for sharing anonymized metrics with partners without exposing PII.

