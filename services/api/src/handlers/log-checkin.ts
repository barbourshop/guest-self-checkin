import type { LambdaHandler } from '../lib/types.js';
import { checkinRequestSchema } from '../lib/types.js';
import { loadEnv } from '../config/env.js';
import { CheckinRepository } from '../lib/checkin-repository.js';
import { docClient } from '../lib/dynamo.js';

const env = (() => {
  try {
    return loadEnv();
  } catch (error) {
    console.warn('checkins env warning', error);
    return null;
  }
})();

const checkinRepo = env ? new CheckinRepository(docClient, env.CHECKINS_TABLE_NAME) : null;

export const checkinsHandler: LambdaHandler = async (event) => {
  try {
    if (!checkinRepo) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Checkins repository not configured' })
      };
    }

    const payload = JSON.parse(event.body ?? '{}');
    const parsed = checkinRequestSchema.parse(payload);
    const today = new Date().toISOString().slice(0, 10);

    const record = await checkinRepo.logCheckin({
      date: today,
      customerHash: parsed.customerHash,
      guestCount: parsed.guestCount,
      passType: parsed.passType,
      membershipType: parsed.membershipType,
      deviceId: parsed.deviceId
    });

    return {
      statusCode: 201,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, record })
    };
  } catch (error) {
    console.error('checkinsHandler error', error);
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
};

