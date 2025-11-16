import {
  Stack,
  StackProps,
  Duration,
  aws_dynamodb as dynamodb,
  aws_lambda_nodejs as lambdaNode,
  aws_lambda as lambda,
  aws_apigateway as apigw,
  aws_secretsmanager as secretsmanager,
  aws_iam as iam
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type ServiceStackProps = StackProps & {
  stage?: string;
};

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: ServiceStackProps) {
    super(scope, id, props);

    const stage = this.node.tryGetContext('stage') ?? props?.stage ?? 'dev';

    const configTable = new dynamodb.Table(this, 'ConfigTable', {
      tableName: `guest-config-${stage}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
    });

    const passesTable = new dynamodb.Table(this, 'PassesTable', {
      tableName: `guest-passes-${stage}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
    });

    const checkinsTable = new dynamodb.Table(this, 'CheckinsTable', {
      tableName: `guest-checkins-${stage}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
    });

    const squareSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SquareAccessToken',
      `guest-square-token-${stage}`
    );

    const apiLambda = new lambdaNode.NodejsFunction(this, 'ApiLambda', {
      entry: path.resolve(__dirname, '..', '..', 'services', 'api', 'src', 'handlers', 'http-handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        externalModules: ['@aws-sdk/*']
      },
      environment: {
        SQUARE_ENV:
          process.env.SQUARE_API_BASE_URL?.includes('squareup.com') && !process.env.SQUARE_API_BASE_URL?.includes('squareupsandbox.com')
            ? 'production'
            : stage === 'prod'
              ? 'production'
              : 'sandbox',
        SQUARE_API_BASE_URL:
          process.env.SQUARE_API_BASE_URL ??
          (stage === 'prod' ? 'https://connect.squareup.com/v2' : 'https://connect.squareupsandbox.com/v2'),
        SQUARE_API_VERSION: '2025-10-16',
        SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID ?? 'SANDBOX_LOCATION',
        CUSTOMER_HASH_SALT: process.env.CUSTOMER_HASH_SALT ?? 'dev-salt',
        MEMBERSHIP_SEGMENT_ID: process.env.MEMBERSHIP_SEGMENT_ID ?? 'SEGMENT',
        DAY_PASS_ITEM_IDS: process.env.DAY_PASS_ITEM_IDS ?? 'ITEM1',
        MEMBERSHIP_ITEM_IDS: process.env.MEMBERSHIP_ITEM_IDS ?? 'ITEM2',
        CONFIG_TABLE_NAME: configTable.tableName,
        PASSES_TABLE_NAME: passesTable.tableName,
        CHECKINS_TABLE_NAME: checkinsTable.tableName,
        SQUARE_SECRET_NAME: squareSecret.secretName,
        STAGE: stage
        // SQUARE_ACCESS_TOKEN removed - now fetched from Secrets Manager at runtime
      }
    });

    // Determine allowed origins - default includes localhost for dev
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : stage === 'dev'
        ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
        : ['*'];

    // Add ALLOWED_ORIGINS to Lambda environment so it can add CORS headers
    apiLambda.addEnvironment('ALLOWED_ORIGINS', allowedOrigins.join(','));

    squareSecret.grantRead(apiLambda);
    configTable.grantReadWriteData(apiLambda);
    passesTable.grantReadWriteData(apiLambda);
    checkinsTable.grantReadWriteData(apiLambda);

    apiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter', 'appconfig:Get*'],
        resources: ['*']
      })
    );

    const api = new apigw.LambdaRestApi(this, 'GuestApiGateway', {
      handler: apiLambda,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-API-Key', 'x-api-key'],
        allowCredentials: false, // Must be false when using wildcard origin
        maxAge: Duration.days(1)
      },
      deployOptions: {
        stageName: stage,
        throttlingRateLimit: parseInt(process.env.API_RATE_LIMIT ?? '100'),
        throttlingBurstLimit: parseInt(process.env.API_BURST_LIMIT ?? '200')
      }
    });

    // API Key for authentication (stored in Secrets Manager)
    // Generate a random API key and store it
    const apiKeySecret = new secretsmanager.Secret(this, 'ApiKeySecret', {
      secretName: `guest-api-key-${stage}`,
      description: `API Key for guest check-in service (${stage})`,
      generateSecretString: {
        secretStringTemplate: '{}',
        generateStringKey: 'apiKey',
        passwordLength: 32,
        excludeCharacters: '"@/\\ '
      }
    });

    // Grant Lambda permission to read the API key secret
    apiKeySecret.grantRead(apiLambda);

    // Read API key from secret and inject into Lambda (or use env var override)
    apiLambda.addEnvironment(
      'API_KEY',
      process.env.API_KEY ?? apiKeySecret.secretValueFromJson('apiKey').unsafeUnwrap()
    );

    this.exportValue(api.url, { name: `GuestApiUrl-${stage}` });
  }
}

