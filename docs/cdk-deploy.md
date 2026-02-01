<!-- AWS deployment instructions -->
# AWS Deployment (CDK) – us-east-1

## Prerequisites
- AWS IAM user/role: `guest-checkin-service-acct` with permissions for CloudFormation, DynamoDB, Lambda, API Gateway, Secrets Manager.
- AWS CLI configured with a profile named `guest-checkin-service-acct`.
- CDK bootstrap completed in `us-east-1` for the target account.

```bash
cd infra
AWS_PROFILE=guest-checkin-service-acct cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
```

## Stacks & Resources
`GuestSelfCheckInAppStack` provisions:
- DynamoDB tables:
  - `guest-config-<stage>`
  - `guest-passes-<stage>`
  - `guest-checkins-<stage>`
- Secrets Manager secret `guest-square-token-<stage>` (store Square access token here).
- Lambda (`ApiLambda`) bundling `services/api/src/handlers/http-handler.ts`.
- API Gateway REST API proxied to the Lambda (`https://.../<stage>`).

Environment variables injected into the Lambda:
```
SQUARE_ENV=(sandbox|production)
SQUARE_API_BASE_URL=...
SQUARE_API_VERSION=2025-10-16
SQUARE_LOCATION_ID=...
CUSTOMER_HASH_SALT=...
MEMBERSHIP_SEGMENT_ID=...
DAY_PASS_ITEM_IDS=...
MEMBERSHIP_ITEM_IDS=...
CONFIG_TABLE_NAME=guest-config-<stage>
PASSES_TABLE_NAME=guest-passes-<stage>
CHECKINS_TABLE_NAME=guest-checkins-<stage>
SQUARE_SECRET_ARN=arn:aws:secretsmanager:...
```

## Deploy Workflow
Before deploying, ensure the Square secret exists:
```bash
aws secretsmanager create-secret \
  --name guest-square-token-<stage> \
  --description "Square creds for guest check-in (<stage>)" \
  --secret-string '{"accessToken":"sandbox-...","applicationId":"sq0idp-Nl7pRF28Lla2wIcVTb0mmw"}' \
  --profile guest-checkin-service-acct \
  --region us-east-1
```

```bash
cd infra
AWS_PROFILE=guest-checkin-service-acct npm run build   # Compile CDK sources
AWS_PROFILE=guest-checkin-service-acct npx cdk deploy GuestSelfCheckInAppStack -c stage=dev
```

Pass `-c stage=prod` or set `STAGE=prod` env variable to promote to production. The stack exports `GuestApiUrl-<stage>`; share this with the frontend.

## Post-Deploy Steps
1. Store the Square access token and application ID in the created secret:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id guest-square-token-dev \
     --secret-string '{"accessToken":"your-access-token-here","applicationId":"sq0idp-Nl7pRF28Lla2wIcVTb0mmw"}' \
     --profile guest-checkin-service-acct \
     --region us-east-1
   ```
2. Update Parameter Store/AppConfig (if needed) with catalog item IDs and feature toggles.
3. Point the Svelte frontend (`PUBLIC_API_BASE_URL`) at the deployed API Gateway URL.
4. Configure Square webhooks to call `https://<api-id>.execute-api.us-east-1.amazonaws.com/<stage>/v1/square/webhooks`.
5. **Get the API key** for frontend use:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id guest-api-key-<stage> \
     --query SecretString \
     --output text \
     --profile guest-checkin-service-acct \
     --region us-east-1 | jq -r .apiKey
   ```
   Store this in your frontend environment (e.g., `VITE_API_KEY` for Vite/Svelte).

## API Security

The API is protected with several security layers:

1. **API Key Authentication** (required by default):
   - All requests must include `X-API-Key` header (except webhook endpoints)
   - API key is stored in Secrets Manager (`guest-api-key-<stage>`)
   - To disable for local dev: set `REQUIRE_API_KEY=false` in Lambda env vars

2. **Rate Limiting**:
   - Default: 100 requests/second sustained, 200 burst
   - Configure via `API_RATE_LIMIT` and `API_BURST_LIMIT` env vars at deploy time
   - Daily quota: 10,000 requests/day (configure via `API_QUOTA_LIMIT`)

3. **CORS Restrictions**:
   - Configure allowed origins via `ALLOWED_ORIGINS` env var (comma-separated)
   - Default: `*` (all origins) - restrict this for production!
   - Example: `ALLOWED_ORIGINS=https://yourdomain.com,https://checkin.yourdomain.com`

4. **Webhook Security**:
   - `/v1/square/webhooks` endpoint skips API key validation
   - Square webhook signature validation should be implemented in the handler

**Production Recommendations:**
- Set `ALLOWED_ORIGINS` to your specific domains
- Rotate API keys regularly via Secrets Manager
- Monitor usage via CloudWatch metrics
- Consider adding AWS WAF for additional DDoS protection

## Troubleshooting: Failed Stack Cleanup

If a deployment fails with "Resource already exists" errors (e.g., DynamoDB tables), the CloudFormation stack is in `ROLLBACK_COMPLETE` state with orphaned resources.

### Clean up and redeploy:

1. **Delete the failed CloudFormation stack:**
   ```bash
   AWS_PROFILE=guest-checkin-service-acct aws cloudformation delete-stack \
     --stack-name GuestSelfCheckInAppStack \
     --region us-east-1
   ```

2. **Wait for the stack deletion to complete** (check status):
   ```bash
   AWS_PROFILE=guest-checkin-service-acct aws cloudformation describe-stacks \
     --stack-name GuestSelfCheckInAppStack \
     --region us-east-1
   ```
   (If the stack is gone, you'll get `Stack with id GuestSelfCheckInAppStack does not exist`)

3. **Manually delete orphaned DynamoDB tables** (if they weren't auto-deleted):
   ```bash
   AWS_PROFILE=guest-checkin-service-acct aws dynamodb delete-table \
     --table-name guest-config-dev --region us-east-1
   AWS_PROFILE=guest-checkin-service-acct aws dynamodb delete-table \
     --table-name guest-passes-dev --region us-east-1
   AWS_PROFILE=guest-checkin-service-acct aws dynamodb delete-table \
     --table-name guest-checkins-dev --region us-east-1
   ```
   (Wait for each table deletion to complete before moving to the next.)

4. **Ensure the Square secret exists** (as per "Deploy Workflow" above).

5. **Redeploy:**
   ```bash
   cd infra
   AWS_PROFILE=guest-checkin-service-acct npm run build
   AWS_PROFILE=guest-checkin-service-acct npx cdk deploy GuestSelfCheckInAppStack -c stage=dev
   ```

