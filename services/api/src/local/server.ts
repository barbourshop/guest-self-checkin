import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { customersSearchHandler } from '../handlers/customers-search.js';
import { passesValidateHandler } from '../handlers/passes-validate.js';
import { checkinsHandler } from '../handlers/log-checkin.js';
import { waiverHintHandler } from '../handlers/waiver-hint.js';
import { metricsHandler } from '../handlers/metrics.js';
import { squareWebhookHandler } from '../handlers/square-webhook.js';

const app = new Hono();

app.post('/v1/customers/search', async (c) => {
  const res = await customersSearchHandler({
    body: await c.req.text(),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    requestContext: {} as Record<string, unknown>
  });
  return c.body(res.body ?? '', res.statusCode, res.headers);
});

app.post('/v1/passes/validate', async (c) => {
  const res = await passesValidateHandler({
    body: await c.req.text(),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    requestContext: {} as Record<string, unknown>
  });
  return c.body(res.body ?? '', res.statusCode, res.headers);
});

app.post('/v1/checkins', async (c) => {
  const res = await checkinsHandler({
    body: await c.req.text(),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    requestContext: {} as Record<string, unknown>
  });
  return c.body(res.body ?? '', res.statusCode, res.headers);
});

app.post('/v1/waiver/hint', async (c) => {
  const res = await waiverHintHandler({
    body: await c.req.text(),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    requestContext: {} as Record<string, unknown>
  });
  return c.body(res.body ?? '', res.statusCode, res.headers);
});

app.get('/v1/metrics/daily', async (c) => {
  const url = new URL(c.req.url, 'http://localhost');
  const res = await metricsHandler({
    body: '',
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    requestContext: {} as Record<string, unknown>
  });
  return c.body(res.body ?? '', res.statusCode, res.headers);
});

app.post('/v1/square/webhooks', async (c) => {
  const res = await squareWebhookHandler({
    body: await c.req.text(),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    requestContext: {} as Record<string, unknown>
  });
  return c.body(res.body ?? '', res.statusCode, res.headers);
});

const port = Number(process.env.API_PORT ?? 3001);
serve(
  {
    fetch: app.fetch,
    port
  },
  () => {
    console.log(`Local API server running on http://localhost:${port}`);
  }
);

