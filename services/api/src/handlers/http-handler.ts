import { Hono } from 'hono';
import type { Context } from 'hono';
import { handle } from 'hono/aws-lambda';
import { customersSearchHandler } from './customers-search.js';
import { passesValidateHandler } from './passes-validate.js';
import { checkinsHandler } from './log-checkin.js';
import { waiverHintHandler } from './waiver-hint.js';
import { metricsHandler } from './metrics.js';
import { squareWebhookHandler } from './square-webhook.js';

const app = new Hono();

// CORS middleware - add CORS headers to all responses
// API Gateway handles preflight (OPTIONS), but Lambda needs to add headers to actual responses
app.use('*', async (c, next) => {
  await next();
  
  const origin = c.req.header('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  
  // Add CORS headers if origin matches
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'false');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, x-api-key');
  }
});

// Handle OPTIONS preflight requests
app.options('*', (c) => {
  const origin = c.req.header('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'false');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, x-api-key');
    c.header('Access-Control-Max-Age', '86400');
  }
  
  return c.body(null, 204);
});

// API Key validation middleware
const expectedApiKey = process.env.API_KEY;
const requireApiKey = process.env.REQUIRE_API_KEY !== 'false'; // Default to true

app.use('*', async (c, next) => {
  // Skip API key check for webhook endpoints (they use Square signature validation)
  if (c.req.path.startsWith('/v1/square/webhooks')) {
    return next();
  }

  // Skip API key check if explicitly disabled (for local dev)
  if (!requireApiKey || !expectedApiKey) {
    return next();
  }

  const providedApiKey = c.req.header('X-API-Key') || c.req.header('x-api-key');

  if (!providedApiKey) {
    return c.json({ error: 'Missing API key in X-API-Key header' }, 401);
  }

  if (providedApiKey !== expectedApiKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  return next();
});

function adapt(handler: typeof customersSearchHandler) {
  return async (c: Context) => {
    const res = await handler({
      body: await c.req.text(),
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      queryStringParameters: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
      requestContext: {} as Record<string, unknown>
    });
    
    const statusCode = res.statusCode || 200;
    const headers = res.headers || {};
    
    // If response is JSON, parse and use c.json() for proper Content-Type handling
    if (res.body && typeof res.body === 'string') {
      try {
        const json = JSON.parse(res.body);
        return c.json(json, statusCode, headers);
      } catch {
        // Not JSON, return as text
        return c.text(res.body, statusCode, headers);
      }
    }
    
    return c.body(res.body ?? '', statusCode, headers);
  };
}

app.post('/v1/customers/search', adapt(customersSearchHandler));
app.post('/v1/passes/validate', adapt(passesValidateHandler));
app.post('/v1/checkins', adapt(checkinsHandler));
app.post('/v1/waiver/hint', adapt(waiverHintHandler));
app.get('/v1/metrics/daily', adapt(metricsHandler));
app.post('/v1/square/webhooks', adapt(squareWebhookHandler));

export const handler = handle(app);

