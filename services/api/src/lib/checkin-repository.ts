import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export type CheckinRecord = {
  pk: string;
  sk: string;
  customerHash: string;
  guestCount: number;
  passType: string;
  membershipType: string;
  deviceId?: string;
  createdAt: string;
};

export class CheckinRepository {
  constructor(private readonly client: DynamoDBDocumentClient, private readonly tableName: string) {}

  async logCheckin(input: {
    date: string;
    customerHash: string;
    guestCount: number;
    passType: string;
    membershipType: string;
    deviceId?: string;
  }) {
    const record: CheckinRecord = {
      pk: `DATE#${input.date}`,
      sk: `${input.customerHash}#${Date.now()}`,
      customerHash: input.customerHash,
      guestCount: input.guestCount,
      passType: input.passType,
      membershipType: input.membershipType,
      deviceId: input.deviceId,
      createdAt: new Date().toISOString()
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record
      })
    );

    return record;
  }

  async getDailyRecords(date: string) {
    const { Items } = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': `DATE#${date}`
        }
      })
    );
    return (Items ?? []) as CheckinRecord[];
  }
}

