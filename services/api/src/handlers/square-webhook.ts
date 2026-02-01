import type { LambdaHandler } from '../lib/types.js';

export const squareWebhookHandler: LambdaHandler = async (event) => {
  try {
    const body = event.body ?? '{}';
    console.log('Square webhook event received', body);
    // TODO: validate Square signature header and update caches/config.
    return {
      statusCode: 202,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('squareWebhookHandler error', error);
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
};

