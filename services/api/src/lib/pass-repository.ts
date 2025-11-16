import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export type RedemptionRecord = {
  pk: string;
  sk: string;
  orderId: string;
  itemId: string;
  status: 'redeemed';
  redeemedAt: string;
  deviceId?: string;
};

export class PassRepository {
  constructor(private readonly client: DynamoDBDocumentClient, private readonly tableName: string) {}

  async getRedemption(orderId: string) {
    const { Item } = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: `ORDER#${orderId}`,
          sk: 'REDEMPTION'
        }
      })
    );
    return Item as RedemptionRecord | undefined;
  }

  async markRedeemed(input: { orderId: string; itemId: string; deviceId?: string }) {
    const record: RedemptionRecord = {
      pk: `ORDER#${input.orderId}`,
      sk: 'REDEMPTION',
      orderId: input.orderId,
      itemId: input.itemId,
      status: 'redeemed',
      redeemedAt: new Date().toISOString(),
      deviceId: input.deviceId
    };
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
        ConditionExpression: 'attribute_not_exists(pk)'
      })
    );
    return record;
  }
}

