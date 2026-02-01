import type { LambdaHandler } from '../lib/types.js';
import { searchRequestSchema } from '../lib/types.js';
import { loadEnv } from '../config/env.js';
import { SquareClient } from '../lib/square-client.js';
import { customerHash } from '../lib/hash.js';
import { getSecretValue } from '../lib/secrets.js';

// Version bump to force Lambda redeploy: 2025-11-16
const VERSION = '1.0.2';

const env = (() => {
  try {
    return loadEnv();
  } catch (error) {
    console.warn('customers-search env load warning:', error);
    return null;
  }
})();

// Helper to log token info (without exposing full token)
const getTokenInfo = (token: string | undefined) => {
  if (!token) return 'missing';
  if (token.length < 10) return `too-short(${token.length})`;
  return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
};

// Lazy-load Square client - will be created with token fetched at runtime
let squareClientInstance: SquareClient | null = null;
let cachedToken: string | null = null;

async function getSquareClient(): Promise<SquareClient | null> {
  if (!env) return null;

  // If already initialized and we have a token from env, use it
  // Otherwise fetch from Secrets Manager
  let accessToken = process.env.SQUARE_ACCESS_TOKEN;

  if (!accessToken || accessToken === 'sandbox-token-placeholder') {
    // Fetch from Secrets Manager at runtime
    const secretName = process.env.SQUARE_SECRET_NAME || `guest-square-token-${process.env.STAGE || 'dev'}`;
    try {
      accessToken = await getSecretValue(secretName, 'accessToken');
      console.log(`Fetched Square token from Secrets Manager: ${getTokenInfo(accessToken)}`);
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

export const customersSearchHandler: LambdaHandler = async (event) => {
  try {
    // Log version and token info for debugging
    console.log(`customers-search handler version: ${VERSION}`);
    
    // Parse and validate request payload
    const payload = JSON.parse(event.body ?? '{}');
    const parsed = searchRequestSchema.parse(payload);

    // Get Square client (fetches token from Secrets Manager if needed)
    const squareClient = await getSquareClient();
    if (!squareClient) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Square client not configured' })
      };
    }

    // Search for customers
    const customers = await squareClient.searchCustomers(parsed.query);
    
    // Build results - using only segment-based membership check for now
    // Order searching requires ORDERS_READ permission which this token doesn't have
    const results = customers.map((customer) => {
      const hasSegmentMembership = customer.segment_ids?.includes(env!.MEMBERSHIP_SEGMENT_ID);
      
      return {
        customerHash: customerHash(customer.id, env!.CUSTOMER_HASH_SALT),
        displayName: [customer.given_name, customer.family_name].filter(Boolean).join(' ') || 'Unknown',
        membership: {
          type: hasSegmentMembership ? 'Member' : 'Non-Member',
          segmentId: env!.MEMBERSHIP_SEGMENT_ID,
          lastVerifiedAt: new Date().toISOString(),
          verifiedVia: hasSegmentMembership ? 'segment' : 'none'
        },
        contact: {
          email: customer.email_address,
          phone: customer.phone_number,
          lotNumber: customer.reference_id
        }
      };
    });
    
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        results,
        pagination: { cursor: null }
      })
    };
  } catch (error) {
    console.error('customersSearchHandler error', error);
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
};

