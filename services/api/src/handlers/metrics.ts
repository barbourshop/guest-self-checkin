import type { LambdaHandler } from '../lib/types.js';
import { metricsQuerySchema } from '../lib/types.js';
import { loadEnv } from '../config/env.js';
import { CheckinRepository } from '../lib/checkin-repository.js';
import { docClient } from '../lib/dynamo.js';

const env = (() => {
  try {
    return loadEnv();
  } catch (error) {
    console.warn('metrics env warning', error);
    return null;
  }
})();

const checkinRepo = env ? new CheckinRepository(docClient, env.CHECKINS_TABLE_NAME) : null;

export const metricsHandler: LambdaHandler = async (event) => {
  try {
    if (!checkinRepo) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Metrics repository not configured' })
      };
    }

    const queryParams = metricsQuerySchema.parse(event.queryStringParameters ?? {});
    const records = await checkinRepo.getDailyRecords(queryParams.date);

    const totalCheckins = records.length;
    const guestDistribution: Record<string, number> = {};
    for (const record of records) {
      const bucket = record.guestCount >= 4 ? '4+' : String(record.guestCount);
      guestDistribution[bucket] = (guestDistribution[bucket] ?? 0) + 1;
    }

    const membershipCounts = records.reduce(
      (acc, record) => {
        acc[record.membershipType] = (acc[record.membershipType] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        date: queryParams.date,
        totalCheckins,
        guestDistribution,
        membershipCounts
      })
    };
  } catch (error) {
    console.error('metricsHandler error', error);
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
};

