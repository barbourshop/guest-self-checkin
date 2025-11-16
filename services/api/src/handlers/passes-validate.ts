import type { LambdaHandler } from '../lib/types.js';
import { passValidationSchema } from '../lib/types.js';
import { loadEnv } from '../config/env.js';
import { SquareClient } from '../lib/square-client.js';
import { getSecretValue } from '../lib/secrets.js';

const env = (() => {
  try {
    return loadEnv();
  } catch (error) {
    console.warn('passes-validate env load warning:', error);
    return null;
  }
})();

// Lazy-load Square client - will be created with token fetched at runtime
let squareClientInstance: SquareClient | null = null;
let cachedToken: string | null = null;

async function getSquareClient(): Promise<SquareClient | null> {
  if (!env) return null;

  let accessToken = process.env.SQUARE_ACCESS_TOKEN;

  if (!accessToken || accessToken === 'sandbox-token-placeholder') {
    // Fetch from Secrets Manager at runtime
    const secretName = process.env.SQUARE_SECRET_NAME || `guest-square-token-${process.env.STAGE || 'dev'}`;
    try {
      accessToken = await getSecretValue(secretName, 'accessToken');
    } catch (error) {
      console.error('Failed to fetch Square token from Secrets Manager:', error);
      throw new Error('Square access token not available');
    }
  }

  // Create or update client if token changed
  if (!squareClientInstance || cachedToken !== accessToken) {
    squareClientInstance = new SquareClient({
      accessToken,
      apiBaseUrl: env.SQUARE_API_BASE_URL,
      apiVersion: env.SQUARE_API_VERSION
    });
    cachedToken = accessToken;
  }

  return squareClientInstance;
}

export const passesValidateHandler: LambdaHandler = async (event) => {
  try {
    if (!env) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Pass validation not configured' })
      };
    }

    // Get Square client (fetches token from Secrets Manager if needed)
    const squareClient = await getSquareClient();
    if (!squareClient) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Square client not configured' })
      };
    }

    const payload = JSON.parse(event.body ?? '{}');
    const parsed = passValidationSchema.parse(payload);

    // Simply retrieve the order - no validation for now
    const order = await squareClient.getOrder(parsed.token);

    // Return the full order details
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        order: {
          id: order.id,
          locationId: order.location_id,
          state: order.state,
          createdAt: order.created_at,
          lineItems: order.line_items?.map(item => ({
            uid: item.uid,
            catalogObjectId: item.catalog_object_id,
            name: item.name,
            variationName: item.variation_name,
            quantity: item.quantity,
            basePriceMoney: item.gross_sales_money,
            totalMoney: item.total_money
          })) || [],
          totalMoney: order.total_money
        }
      })
    };
  } catch (error) {
    console.error('passesValidateHandler error', error);
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
};

