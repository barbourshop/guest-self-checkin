import type { LambdaHandler } from '../lib/types.js';
import { waiverHintSchema } from '../lib/types.js';
import { loadEnv } from '../config/env.js';
import { WaiverHintRepository } from '../lib/waiver-hint-repository.js';
import { docClient } from '../lib/dynamo.js';

const env = (() => {
  try {
    return loadEnv();
  } catch (error) {
    console.warn('waiver-hint env warning', error);
    return null;
  }
})();

const waiverRepo = env ? new WaiverHintRepository(docClient, env.CONFIG_TABLE_NAME) : null;

export const waiverHintHandler: LambdaHandler = async (event) => {
  try {
    if (!waiverRepo) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Waiver repository not configured' })
      };
    }

    const payload = JSON.parse(event.body ?? '{}');
    const parsed = waiverHintSchema.parse(payload);

    await waiverRepo.upsert({
      customerHash: parsed.customerHash,
      waiverVersion: parsed.waiverVersion,
      acknowledgedAt: parsed.acknowledgedAt ?? new Date().toISOString()
    });

    return {
      statusCode: 204
    };
  } catch (error) {
    console.error('waiverHintHandler error', error);
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
};

