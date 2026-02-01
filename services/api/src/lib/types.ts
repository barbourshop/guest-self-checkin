import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';

export type LambdaHandler = (
  event: APIGatewayProxyEventV2
) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }>;

export const searchRequestSchema = z.object({
  query: z.object({
    type: z.enum(['phone', 'email', 'lot']),
    value: z.string().min(3),
    fuzzy: z.boolean().optional()
  }),
  includeMembershipMeta: z.boolean().optional()
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const passValidationSchema = z.object({
  token: z.string().min(6),
  deviceId: z.string().uuid().optional()
});

export type PassValidationRequest = z.infer<typeof passValidationSchema>;

export const checkinRequestSchema = z.object({
  customerHash: z.string().min(10),
  guestCount: z.number().int().positive(),
  passType: z.enum(['day-pass', 'membership', 'walk-in']).default('membership'),
  membershipType: z.enum(['Member', 'Non-Member']).default('Member'),
  deviceId: z.string().uuid().optional()
});

export type CheckinRequest = z.infer<typeof checkinRequestSchema>;

export const waiverHintSchema = z.object({
  customerHash: z.string().min(10),
  acknowledged: z.boolean(),
  waiverVersion: z.string().min(3),
  acknowledgedAt: z.string().datetime().optional()
});

export type WaiverHintRequest = z.infer<typeof waiverHintSchema>;

export const metricsQuerySchema = z.object({
  date: z.string().default(() => new Date().toISOString().slice(0, 10))
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;

